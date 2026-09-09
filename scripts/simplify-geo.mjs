// One-off data-prep script — NOT part of the app build.
//
// Shrinks the committed geojson/json map files by simplifying polygon
// detail (mapshaper, Visvalingam-weighted + keep-shapes so no island or
// small region ever disappears) and snapping coordinate precision.
//
// Safety: a handful of source files contain a few genuinely
// self-intersecting rings (real defects in the upstream GADM/NUTS/etc.
// data, found with @turf/kinks). Mapshaper's automatic intersection
// "repair" during simplification can turn those specific rings into
// wild, map-spanning shapes. So those few features are detected up
// front and carried through completely untouched — only the
// structurally clean features (the overwhelming majority) get
// simplified.
//
// Usage: node scripts/simplify-geo.mjs [--check-only]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import kinks from "@turf/kinks";
import { feature as turfFeature } from "@turf/helpers";
import { geoArea } from "d3-geo";

const DATA_DIR = path.resolve(import.meta.dirname, "../src/data");
const MAPSHAPER = path.resolve(
  import.meta.dirname,
  "../node_modules/.bin/mapshaper" + (process.platform === "win32" ? ".cmd" : ""),
);
const CHECK_ONLY = process.argv.includes("--check-only");

// { file, simplifyPct } — pct omitted/undefined means "too small to bother".
const FILES = [
  { file: "turkey-d.geojson", pct: 8 },
  { file: "canada.json", pct: 8 },
  { file: "brazil.json", pct: 8 },
  { file: "europe.json", pct: 8 },
  { file: "russia.geojson", pct: 8 },
  { file: "usa-c.geojson", pct: 8 },
  { file: "india.json", pct: 10 },
  { file: "italy.geojson", pct: 10 },
  { file: "usa.json", pct: 12 },
  { file: "spain.geojson", pct: 12 },
  { file: "uk.geojson.json", pct: 12 },
  { file: "turkey.json", pct: 15 },
  { file: "europe-n3.geojson", pct: 15 },
  { file: "germany.json", pct: 20 },
  { file: "europe-n2.geojson", pct: 20 },
  { file: "greece.geojson", pct: 20 },
  { file: "europe-n1.geojson", pct: 25 },
  { file: "france.geojson", pct: 25 },
  { file: "indonesia.json", pct: 25 },
  // china.json (56KB) skipped — not worth the risk/complexity.
];

const bboxArea = (geom) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      const [x, y] = c;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return (maxX - minX) * (maxY - minY);
};

function findBadIndexes(fc) {
  const bad = new Set();
  fc.features.forEach((f, i) => {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) return;
    try {
      if (kinks(turfFeature(f.geometry)).features.length > 0) bad.add(i);
    } catch {
      bad.add(i); // if we can't even check it, don't risk simplifying it
    }
  });
  return bad;
}

function runMapshaper(fc, pct, tmpDir, tag) {
  const inPath = path.join(tmpDir, `${tag}-in.geojson`);
  const outPath = path.join(tmpDir, `${tag}-out.geojson`);
  fs.writeFileSync(inPath, JSON.stringify(fc));
  execFileSync(MAPSHAPER, [
    inPath,
    "-simplify", `${pct}%`, "weighted", "keep-shapes",
    "-clean",
    "-o", outPath, "format=geojson", "precision=0.0001",
  ], { stdio: "pipe", shell: process.platform === "win32" });
  return JSON.parse(fs.readFileSync(outPath, "utf8"));
}

// Batch mode builds shared topology across every feature in one go, which is
// fast but means mapshaper's intersection auto-repair can occasionally weld
// or mangle an unrelated, individually-clean feature's border (seen on
// europe.json: Latvia itself has no self-intersection, but repairing some
// other country's border corrupted it). When that happens for a file,
// fall back to simplifying every feature completely on its own — slower,
// but there's no shared topology left for a repair to leak across.
function simplifyPerFeatureIndependently(cleanFc, pct, tmpDir, tag) {
  return {
    type: "FeatureCollection",
    features: cleanFc.features.map((f, i) =>
      runMapshaper({ type: "FeatureCollection", features: [f] }, pct, tmpDir, `${tag}-f${i}`).features[0],
    ),
  };
}

// mapshaper always normalizes ring winding to the RFC 7946 convention
// (exterior rings counter-clockwise) on export, regardless of what
// convention the input used. This app's source files — and the globe's
// orthographic/antimeridian-aware rendering in WorldGlobe.jsx in
// particular — were built expecting the *opposite* (clockwise-exterior)
// convention the original data happens to use; d3-geo's flat Mercator
// paths (used everywhere else) don't care either way, so this is
// invisible outside the globe. Left uncorrected, every ring mapshaper
// touches renders "inside out" on the globe (fills the whole sphere
// instead of just the region). So: flip every ring's point order back
// after mapshaper is done with it.
const reverseWinding = (fc) => ({
  ...fc,
  features: fc.features.map((f) => ({
    ...f,
    geometry: reverseGeometryRings(f.geometry),
  })),
});

function reverseGeometryRings(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon")
    return { ...geometry, coordinates: geometry.coordinates.map(r => [...r].reverse()) };
  if (geometry.type === "MultiPolygon")
    return { ...geometry, coordinates: geometry.coordinates.map(p => p.map(r => [...r].reverse())) };
  return geometry;
}

// Belt-and-suspenders companion to the bbox check: a ring wound backwards
// reads to d3-geo as "everything except this shape", so its geoArea comes
// back near a full sphere (4*PI sr) instead of the tiny fraction any real
// country/region should be.
function windingCheck(features) {
  const HALF_SPHERE = 2 * Math.PI;
  for (const f of features) {
    if (!f.geometry) continue;
    const area = geoArea(f.geometry);
    if (area > HALF_SPHERE) {
      const name = f.properties?.name || f.properties?.NAME || f.properties?.NAME_1 || "?";
      return `feature ${name} has backwards winding (geoArea ${area.toFixed(2)} sr, sphere is ${(4 * Math.PI).toFixed(2)} sr)`;
    }
  }
  return null;
}

function bboxExplosionCheck(originalFeatures, simplifiedFeatures) {
  for (let i = 0; i < originalFeatures.length; i++) {
    const origArea = bboxArea(originalFeatures[i].geometry);
    const simpArea = bboxArea(simplifiedFeatures[i].geometry);
    if (origArea > 0 && simpArea > origArea * 3) {
      const name = originalFeatures[i].properties?.name || originalFeatures[i].properties?.NAME || i;
      return `feature ${name} bbox area exploded (${origArea.toFixed(4)} -> ${simpArea.toFixed(4)})`;
    }
  }
  return null;
}

function simplifyClean(cleanFc, pct, tmpDir, tag) {
  let batched = runMapshaper(cleanFc, pct, tmpDir, tag);
  const problem = bboxExplosionCheck(cleanFc.features, batched.features);
  if (problem) {
    console.log(`  batch simplify triggered a bad repair (${problem}) — retrying per-feature independently...`);
    batched = simplifyPerFeatureIndependently(cleanFc, pct, tmpDir, tag);
    const stillBad = bboxExplosionCheck(cleanFc.features, batched.features);
    if (stillBad) {
      throw new Error(`${tag}: still broken after per-feature fallback — ${stillBad}. Investigate before re-running.`);
    }
  }

  const rewound = reverseWinding(batched);
  const windingProblem = windingCheck(rewound.features);
  if (windingProblem) {
    throw new Error(`${tag}: ${windingProblem} after winding correction — investigate before re-running.`);
  }
  return rewound;
}

function processFile({ file, pct }, tmpDir) {
  const filePath = path.join(DATA_DIR, file);
  const before = fs.statSync(filePath).size;
  const fc = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const badIdx = findBadIndexes(fc);
  const cleanFeatures = fc.features.filter((_, i) => !badIdx.has(i));
  const dirtyFeatures = fc.features.filter((_, i) => badIdx.has(i));

  console.log(
    `${file}: ${fc.features.length} features, ${badIdx.size} left untouched (self-intersecting source data)` +
    (badIdx.size ? ` [${[...badIdx].map(i => fc.features[i].properties?.name || fc.features[i].properties?.NAME || fc.features[i].properties?.NAME_1 || i).join(", ")}]` : ""),
  );

  if (CHECK_ONLY) return;

  const simplifiedClean = simplifyClean({ type: "FeatureCollection", features: cleanFeatures }, pct, tmpDir, file.replace(/[^a-z0-9]/gi, "_"));

  const merged = { type: "FeatureCollection", features: [...simplifiedClean.features, ...dirtyFeatures] };
  fs.writeFileSync(filePath, JSON.stringify(merged));

  const after = fs.statSync(filePath).size;
  console.log(
    `  -> ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB ` +
    `(${(100 * (1 - after / before)).toFixed(0)}% smaller)`,
  );
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "geo-simplify-"));
let totalBefore = 0, totalAfter = 0;
for (const entry of FILES) {
  const p = path.join(DATA_DIR, entry.file);
  totalBefore += fs.statSync(p).size;
  processFile(entry, tmpDir);
  totalAfter += fs.statSync(p).size;
}
if (!CHECK_ONLY) {
  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
}
