import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import polygonClipping from "polygon-clipping";
import worldAtlasData from "world-atlas/countries-110m.json";

const SIZE = 760;
const CENTER = SIZE / 2;
const WORLD_SCALE = 310;
const WORLD_ROT = [-25, -26];
const EUROPE_SCALE = 680;
const EUROPE_ROT = [-14, -48];
const ZOOM_DURATION = 700;
// Degrees of rotation per pixel dragged, scaled so it feels consistent
// whether zoomed out (world) or in (Europe) — bigger scale = finer control.
const DRAG_DEGREES_AT_SCALE = 90;
const MAX_TILT = 80;
const REGION_MAX_POINTS = 250;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const HIDDEN_IN_WORLD = new Set(["germany", "france", "italy", "spain", "greece", "turkey", "russia", "uk"]);

const COUNTRY_NAME_TO_ID = {
  "France": "france",
  "Germany": "germany",
  "Italy": "italy",
  "Spain": "spain",
  "Greece": "greece",
  "Turkey": "turkey",
  "Russia": "russia",
  "United Kingdom": "uk",
};

const GENERIC_EU_COLOR = "#4ade80";

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const simplifyRing = (ring, maxPoints = 250) => {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const simplified = ring.filter((_, i) => i === 0 || i === ring.length - 1 || i % step === 0);
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) simplified.push(first);
  return simplified;
};

// Unlike simplifyRing, doesn't force closure — border segments are open paths,
// not closed loops, so appending the start point back on would draw a bogus line.
const simplifyLine = (line, maxPoints = 200) => {
  if (!Array.isArray(line) || line.length <= maxPoints) return line;
  const step = Math.ceil(line.length / maxPoints);
  return line.filter((_, i) => i === 0 || i === line.length - 1 || i % step === 0);
};

const simplifyGeometry = (geometry, maxPoints) => {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon")
    return { ...geometry, coordinates: geometry.coordinates.map(r => simplifyRing(r, maxPoints)) };
  if (geometry.type === "MultiPolygon")
    return { ...geometry, coordinates: geometry.coordinates.map(p => p.map(r => simplifyRing(r, maxPoints))) };
  if (geometry.type === "LineString")
    return { ...geometry, coordinates: simplifyLine(geometry.coordinates, maxPoints) };
  if (geometry.type === "MultiLineString")
    return { ...geometry, coordinates: geometry.coordinates.map(l => simplifyLine(l, maxPoints)) };
  return geometry;
};

const simplifyGeoData = (geoData, maxPoints) => ({
  ...geoData,
  features: geoData.features.map(f => ({ ...f, geometry: simplifyGeometry(f.geometry, maxPoints) }))
});

const asMultiPolygon = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return null;
};

// Countries broken into dozens of state/province features (USA, Canada,
// India, China, Indonesia, Brazil...) are what makes reprojecting them every
// frame during a drag expensive — not the coastline detail, but the sheer
// number of separate ring boundaries. Dissolve each country's own internal
// admin borders into a single national outline once up front, so dragging
// can keep the color visible cheaply instead of hiding it.
//
// Adjacent states' shared borders were almost never digitized as identical
// coordinate sequences in this source data, so a naive union produces
// hundreds of sliver polygons along every state line instead of one clean
// outline (verified: USA's 52 features unioned into 469 fragments). Snapping
// coordinates to a coarse grid first makes touching borders land on the same
// point so they actually cancel out — the ~20km error this introduces is
// far below one pixel on a ~600px-wide globe, so nothing looks different.
const UNION_INPUT_MAX_POINTS = 80;
const UNION_SNAP_GRID = 0.8;
const unionGeometryCache = new WeakMap();

const snapRing = (ring) =>
  ring.map(([x, y]) => [
    Math.round(x / UNION_SNAP_GRID) * UNION_SNAP_GRID,
    Math.round(y / UNION_SNAP_GRID) * UNION_SNAP_GRID,
  ]);

const snapGeometry = (geometry) => {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon")
    return { ...geometry, coordinates: geometry.coordinates.map(snapRing) };
  if (geometry.type === "MultiPolygon")
    return { ...geometry, coordinates: geometry.coordinates.map(p => p.map(snapRing)) };
  return geometry;
};

// Russia's landmass is digitized as many separate polygon pieces that meet
// at the antimeridian (some ending at +180, others starting at -180) — each
// piece's own span looks unremarkable, but the union algorithm works in
// plain lon/lat space with no concept of the dateline wraparound, so
// unioning them produces a polygon whose winding gets misread by the
// projection as "everything except this sliver" — rendering as a solid
// circle covering the whole visible globe instead of just Russia's outline.
// The only catalog country this affects is Russia, and it's already treated
// as a special case elsewhere in this file (buildEuropeFeatures below) —
// simplest fix is to leave it out of the interactive union entirely; the
// static full-detail view (which handles this properly) is unaffected.
const ANTIMERIDIAN_NAMES = new Set(["Russia"]);
const featureName = (feature) => feature.properties?.name || feature.properties?.admin || "";

// Belt-and-suspenders: also drop any individual polygon piece that itself
// reaches within a few degrees of +/-180, in case another dataset has a
// similar dateline-spanning feature we haven't named above.
const NEAR_ANTIMERIDIAN = 175;

const touchesAntimeridian = (ring) => {
  for (const [lon] of ring) {
    if (lon >= NEAR_ANTIMERIDIAN || lon <= -NEAR_ANTIMERIDIAN) return true;
  }
  return false;
};

const dropAntimeridianPolygons = (multiPolygon) =>
  multiPolygon.filter(polygon => !touchesAntimeridian(polygon[0]));

function computeUnionGeometry(geoData) {
  const polys = (geoData?.features ?? [])
    .filter(f => !ANTIMERIDIAN_NAMES.has(featureName(f)))
    .map(f => asMultiPolygon(snapGeometry(simplifyGeometry(f.geometry, UNION_INPUT_MAX_POINTS))))
    .filter(Boolean)
    .map(dropAntimeridianPolygons)
    .filter(p => p.length);
  if (!polys.length) return null;
  try {
    const unioned = polygonClipping.union(...polys);
    // Snapping adjacent states/provinces to the same coarse grid (above)
    // occasionally leaves a sliver where two borders land a grid cell apart
    // instead of exactly cancelling out — the union algorithm then reports
    // that sliver as a real interior hole (verified: Europe's main landmass
    // came back with 19 tiny rectangular holes scattered across it, each
    // under ~2.5 sq. degrees). This is a rough drag-time placeholder, not
    // the accurate view, so just drop every hole and keep solid shapes —
    // simpler and more robust than trying to tell an artifact from a
    // genuine enclave at this scale.
    const solid = unioned.map(polygon => [polygon[0]]);
    // polygon-clipping winds exterior rings the opposite way from what
    // d3-geo expects (verified: d3.geoArea on the raw output reports
    // hundreds of steradians — many times the whole sphere — because every
    // ring's inside/outside gets read backwards; reversing point order
    // brings the area back down to what the country's real size should be).
    const rewound = solid.map(polygon => polygon.map(ring => [...ring].reverse()));
    return { type: "MultiPolygon", coordinates: rewound };
  } catch {
    return null; // malformed geometry — interactive draw just skips this region
  }
}

function getUnionGeometry(geoData) {
  if (!geoData) return null;
  if (!unionGeometryCache.has(geoData)) {
    unionGeometryCache.set(geoData, computeUnionGeometry(geoData));
  }
  return unionGeometryCache.get(geoData);
}

// The 110m world atlas is only a non-interactive backdrop (the 15 clickable
// regions are simplified separately above at a higher point budget since
// they're highlighted/interactive), but it's redrawn every animation frame
// while the globe rotates — simplify it aggressively once at load instead of
// reprojecting ~13k raw points 60 times a second for a small rotating thumbnail.
// merge() dissolves the ~180 individual country borders into a handful of
// landmasses (Eurasia+Africa, the Americas, ...) — same solid-fill look, far
// fewer rings to clip/path per frame, which buys room for a much higher
// per-ring point budget (coastlines actually look like coastlines) without
// costing anywhere near what redrawing 180 separate countries did.
const WORLD_LAND_MAX_POINTS = 350;
const WORLD_BORDER_MAX_POINTS = 60;
const worldLand = simplifyGeometry(
  topojson.merge(worldAtlasData, worldAtlasData.objects.countries.geometries),
  WORLD_LAND_MAX_POINTS
);
const worldBorders = simplifyGeometry(
  topojson.mesh(worldAtlasData, worldAtlasData.objects.countries, (a, b) => a !== b),
  WORLD_BORDER_MAX_POINTS
);

function drawMapLabel(map, rotation, projection, context, fontSize = 15) {
  const point = projection(map.labelCoordinates);
  const visible = d3.geoDistance(map.labelCoordinates, [-rotation[0], -rotation[1]]) < Math.PI / 2;
  if (!point || !visible) return;
  context.save();
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 5;
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#0f172a";
  context.strokeText(map.shortLabel, point[0], point[1] - 12);
  context.fillText(map.shortLabel, point[0], point[1] - 12);
  context.restore();
}

export default function WorldGlobe({ maps, onSelectMap, onSelectGroup, activeMapId, globeGroup }) {
  const canvasRef = useRef();
  const onSelectMapRef = useRef(onSelectMap);
  const onSelectGroupRef = useRef(onSelectGroup);
  const activeMapIdRef = useRef(activeMapId);
  const globeGroupRef = useRef(globeGroup);
  const hoveredRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, lastX: 0, lastY: 0, startX: 0, startY: 0, moved: false });
  const requestRenderRef = useRef(() => {});

  const projStateRef = useRef({ scale: WORLD_SCALE, rotX: WORLD_ROT[0], rotY: WORLD_ROT[1] });
  const isFirstGroupRenderRef = useRef(true);

  const animRef = useRef({
    active: false,
    startTime: 0,
    fromScale: WORLD_SCALE, toScale: WORLD_SCALE,
    fromRotX: WORLD_ROT[0], toRotX: WORLD_ROT[0],
    fromRotY: WORLD_ROT[1], toRotY: WORLD_ROT[1],
  });

  const globeRegions = useMemo(() =>
    maps.map(map => ({
      ...map,
      simplifiedGeoData: simplifyGeoData(map.geoData, REGION_MAX_POINTS),
      unionGeoData: getUnionGeometry(map.geoData),
    })),
    [maps]
  );

  useEffect(() => { onSelectMapRef.current = onSelectMap; }, [onSelectMap]);
  useEffect(() => { onSelectGroupRef.current = onSelectGroup; }, [onSelectGroup]);
  useEffect(() => { activeMapIdRef.current = activeMapId; }, [activeMapId]);

  useEffect(() => {
    globeGroupRef.current = globeGroup;
    if (isFirstGroupRenderRef.current) {
      isFirstGroupRenderRef.current = false;
      return;
    }

    const anim = animRef.current;
    const proj = projStateRef.current;

    anim.active = true;
    anim.startTime = performance.now();
    anim.fromScale = proj.scale;
    anim.fromRotX = proj.rotX;
    anim.fromRotY = proj.rotY;

    if (globeGroup === "europe") {
      anim.toScale = EUROPE_SCALE;
      anim.toRotX = EUROPE_ROT[0];
      anim.toRotY = EUROPE_ROT[1];
    } else {
      anim.toScale = WORLD_SCALE;
      anim.toRotX = proj.rotX;
      anim.toRotY = WORLD_ROT[1];
    }

    requestRenderRef.current();
  }, [globeGroup]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = SIZE * pixelRatio;
    canvas.height = SIZE * pixelRatio;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const projection = d3.geoOrthographic()
      .translate([CENTER, CENTER])
      .scale(WORLD_SCALE)
      .clipAngle(90)
      .precision(1);

    const path = d3.geoPath(projection, context);
    const graticule = d3.geoGraticule10();
    const sphere = { type: "Sphere" };

    // Ocean — richer gradient, light from upper-left
    const oceanGradient = context.createRadialGradient(CENTER - 130, CENTER - 160, 15, CENTER, CENTER, 340);
    oceanGradient.addColorStop(0,    "#dff0ff");
    oceanGradient.addColorStop(0.35, "#5ab8f5");
    oceanGradient.addColorStop(0.72, "#1878cc");
    oceanGradient.addColorStop(1,    "#093566");

    // Stars — fixed positions, baked into the cached background layer below
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * SIZE,
      y: Math.random() * SIZE,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.65 + 0.2,
    }));

    // The ocean/atmosphere/rim (behind the rotating land) and the night-shadow/
    // specular highlight (in front of it) are all positioned purely by canvas
    // center + current scale — not by rotation — so during idle rotation
    // (scale constant) they're pixel-identical every frame. Pre-render them to
    // offscreen canvases and just blit those each frame instead of recreating
    // 3 gradients + an expensive shadowBlur + 160 star draws 60 times a second.
    // Cache is invalidated only when scale actually changes (i.e. during the
    // brief zoom transition into/out of the Europe group).
    let cachedLayerScale = null;
    let backgroundLayer = null;
    let foregroundLayer = null;

    const makeOffscreenCanvas = () => {
      const layer = document.createElement("canvas");
      layer.width = canvas.width;
      layer.height = canvas.height;
      const layerCtx = layer.getContext("2d");
      layerCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return { layer, layerCtx };
    };

    const buildBackgroundLayer = () => {
      const { layer, layerCtx } = makeOffscreenCanvas();
      const prevContext = path.context();
      path.context(layerCtx);

      stars.forEach(st => {
        layerCtx.beginPath();
        layerCtx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        layerCtx.fillStyle = `rgba(255,255,255,${st.a})`;
        layerCtx.fill();
      });

      layerCtx.save();
      layerCtx.shadowColor  = "rgba(8, 20, 80, 0.55)";
      layerCtx.shadowBlur   = 42;
      layerCtx.shadowOffsetY = 22;
      layerCtx.beginPath();
      path(sphere);
      layerCtx.fillStyle = oceanGradient;
      layerCtx.fill();
      layerCtx.restore();

      const sc = projStateRef.current.scale;
      const atmoGrad = layerCtx.createRadialGradient(CENTER, CENTER, sc * 0.93, CENTER, CENTER, sc * 1.20);
      atmoGrad.addColorStop(0,    "rgba(100, 180, 255, 0)");
      atmoGrad.addColorStop(0.35, "rgba(110, 190, 255, 0.20)");
      atmoGrad.addColorStop(0.72, "rgba(80,  155, 255, 0.08)");
      atmoGrad.addColorStop(1,    "rgba(55,  120, 255, 0)");
      layerCtx.beginPath();
      layerCtx.arc(CENTER, CENTER, sc * 1.20, 0, Math.PI * 2);
      layerCtx.fillStyle = atmoGrad;
      layerCtx.fill();

      layerCtx.beginPath();
      path(sphere);
      layerCtx.strokeStyle = "rgba(140, 210, 255, 0.30)";
      layerCtx.lineWidth   = 2;
      layerCtx.stroke();

      path.context(prevContext);
      return layer;
    };

    const buildForegroundLayer = () => {
      const { layer, layerCtx } = makeOffscreenCanvas();
      const prevContext = path.context();
      path.context(layerCtx);
      const sc = projStateRef.current.scale;

      layerCtx.save();
      layerCtx.beginPath();
      path(sphere);
      layerCtx.clip();
      const nightGrad = layerCtx.createRadialGradient(
        CENTER + sc * 0.62, CENTER + sc * 0.12, 0,
        CENTER + sc * 0.18, CENTER,              sc * 1.28
      );
      nightGrad.addColorStop(0,    "rgba(0, 0, 18, 0.84)");
      nightGrad.addColorStop(0.28, "rgba(0, 0, 18, 0.50)");
      nightGrad.addColorStop(0.56, "rgba(0, 0, 18, 0.14)");
      nightGrad.addColorStop(1,    "rgba(0, 0, 18, 0)");
      layerCtx.beginPath();
      layerCtx.rect(0, 0, SIZE, SIZE);
      layerCtx.fillStyle = nightGrad;
      layerCtx.fill();
      layerCtx.restore();

      layerCtx.save();
      layerCtx.beginPath();
      path(sphere);
      layerCtx.clip();
      const specGrad = layerCtx.createRadialGradient(
        CENTER - sc * 0.38, CENTER - sc * 0.44, 0,
        CENTER - sc * 0.12, CENTER - sc * 0.08, sc * 1.1
      );
      specGrad.addColorStop(0,    "rgba(255, 255, 255, 0.30)");
      specGrad.addColorStop(0.18, "rgba(255, 255, 255, 0.11)");
      specGrad.addColorStop(0.44, "rgba(255, 255, 255, 0.02)");
      specGrad.addColorStop(1,    "rgba(255, 255, 255, 0)");
      layerCtx.beginPath();
      layerCtx.rect(0, 0, SIZE, SIZE);
      layerCtx.fillStyle = specGrad;
      layerCtx.fill();
      layerCtx.restore();

      path.context(prevContext);
      return layer;
    };

    // Europe lookup caches
    const europeRegion = globeRegions.find(m => m.id === "europe");
    const specificMaps = globeRegions.filter(m => HIDDEN_IN_WORLD.has(m.id));
    const specificMapById = Object.fromEntries(specificMaps.map(m => [m.id, m]));

    const buildEuropeFeatures = (geoData) => geoData?.features.map(feat => {
      const name = feat.properties?.name || feat.properties?.admin || "";
      if (name !== "Russia" || feat.geometry?.type !== "MultiPolygon") return feat;

      const clipped = feat.geometry.coordinates
        .map(polygon => {
          const ring = polygon[0];
          let minL = Infinity, maxL = -Infinity;
          ring.forEach(([lon]) => { if (lon < minL) minL = lon; if (lon > maxL) maxL = lon; });
          if (minL > 80 || maxL < -25) return null;
          if (maxL > 80) {
            const cut = ring.filter(([lon]) => lon < 80);
            if (cut.length < 3) return null;
            const f = cut[0], l = cut[cut.length - 1];
            if (f[0] !== l[0] || f[1] !== l[1]) cut.push(cut[0]);
            return [cut];
          }
          return polygon;
        })
        .filter(Boolean);

      return { ...feat, geometry: { ...feat.geometry, coordinates: clipped } };
    }) ?? [];

    const europeFeatures = buildEuropeFeatures(europeRegion?.simplifiedGeoData);

    let rafId = null;
    let visible = true;
    const visibilityObs = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) requestRender();
      },
      { threshold: 0 }
    );
    visibilityObs.observe(canvas);

    function requestRender() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(render);
    }
    requestRenderRef.current = requestRender;

    const render = (now) => {
      rafId = null;
      const anim = animRef.current;
      const proj = projStateRef.current;
      const currentGroup = globeGroupRef.current;

      // Update projection state — only the zoom transition animates the
      // globe on its own; otherwise rotation only changes via drag.
      if (anim.active) {
        const t = Math.min((now - anim.startTime) / ZOOM_DURATION, 1);
        const e = easeInOut(t);
        proj.scale = anim.fromScale + (anim.toScale - anim.fromScale) * e;
        proj.rotX  = anim.fromRotX  + (anim.toRotX  - anim.fromRotX)  * e;
        proj.rotY  = anim.fromRotY  + (anim.toRotY  - anim.fromRotY)  * e;
        if (t >= 1) {
          anim.active = false;
          proj.scale = anim.toScale;
          proj.rotX  = anim.toRotX;
          proj.rotY  = anim.toRotY;
        }
      }

      if (visible) {
        projection.scale(proj.scale).rotate([proj.rotX, proj.rotY, 0]);

        const sc = proj.scale;

        // Rebuild the cached static layers only when scale actually changes
        // (i.e. mid zoom-transition) — the rest of the time this is a no-op
        // and we just blit the same two offscreen canvases every frame.
        if (cachedLayerScale !== sc) {
          backgroundLayer = buildBackgroundLayer();
          foregroundLayer = buildForegroundLayer();
          cachedLayerScale = sc;
        }

        // ── Clear + cached ocean/atmosphere/rim/stars backdrop ─────
        context.clearRect(0, 0, SIZE, SIZE);
        context.drawImage(backgroundLayer, 0, 0, SIZE, SIZE);

        // ── Graticule ─────────────────────────────────────────────
        context.beginPath();
        path(graticule);
        context.strokeStyle = "rgba(255, 255, 255, 0.14)";
        context.lineWidth   = 0.5;
        context.stroke();

        const activeId  = activeMapIdRef.current;
        const hoveredId = hoveredRef.current;
        // Mid-rotation (drag or zoom transition), draw coarse geometry so
        // every frame stays cheap; snap to full detail once movement stops.
        const interactive = dragStateRef.current.dragging || anim.active;

        // ── WORLD mode ────────────────────────────────────────────
        if (!currentGroup || anim.active) {
          // Non-interactive world land
          context.beginPath();
          path(worldLand);
          context.fillStyle = "#3a7d5c";
          context.fill();

          context.beginPath();
          path(worldBorders);
          context.strokeStyle = "rgba(255,255,255,0.20)";
          context.lineWidth   = 0.4;
          context.stroke();

          // Interactive maps on top — some (USA, Canada, India...) are dozens
          // of state/province features, each an expensive path+clip to
          // reproject every frame. While rotating, draw each region's
          // pre-dissolved single-outline version instead (real geometry, no
          // internal admin borders left to path) — still cheap, still the
          // right color and shape, just without hover/labels. Snaps to full
          // per-state detail the instant motion stops.
          globeRegions
            .filter(m => !HIDDEN_IN_WORLD.has(m.id))
            .forEach((map) => {
              if (interactive) {
                if (!map.unionGeoData) return;
                context.beginPath();
                path(map.unionGeoData);
                context.fillStyle = map.globeColor;
                context.fill();
                return;
              }

              const highlight = activeId === map.id || hoveredId === map.id;

              // Fill the whole region — adjacent features (states/provinces/countries)
              // merge seamlessly so no internal division seams are visible
              context.beginPath();
              path(map.simplifiedGeoData);
              context.fillStyle = highlight ? "#fde047" : map.globeColor;
              context.fill();

              if (highlight) {
                // Glow border on hover/active — inner lines invisible against yellow fill
                context.save();
                context.shadowColor = "rgba(254,240,138,0.72)";
                context.shadowBlur  = 12;
                context.beginPath();
                path(map.simplifiedGeoData);
                context.strokeStyle = "#fef9c3";
                context.lineWidth   = 1.5;
                context.stroke();
                context.restore();
              } else {
                // Stroke in the region's own fill color, slightly thicker
                // than a hairline — grows the colored footprint just enough
                // to cover the seam where the lower-resolution world
                // backdrop underneath doesn't perfectly trace this region's
                // (independently-sourced, higher-detail) outline.
                context.strokeStyle = map.globeColor;
                context.lineWidth   = 1.4;
                context.stroke();
              }
            });

          if (!interactive) {
            const rotation  = projection.rotate();
            const europeMap = globeRegions.find(m => m.id === "europe");
            if (europeMap) drawMapLabel(europeMap, rotation, projection, context, 17);
            globeRegions
              .filter(m => !HIDDEN_IN_WORLD.has(m.id) && m.id !== "europe")
              .forEach(m => drawMapLabel(m, rotation, projection, context, 15));
          }

        // ── EUROPE ZOOM mode ──────────────────────────────────────
        } else if (interactive) {
          // Same trade as world mode: plain merged landmass while rotating,
          // full per-country color/detail once the drag settles.
          context.beginPath();
          path(worldLand);
          context.fillStyle = "#3a7d5c";
          context.fill();
        } else {
          europeFeatures.forEach((feature) => {
            const name      = feature.properties?.name || feature.properties?.admin || "";
            const mapId     = COUNTRY_NAME_TO_ID[name];
            const specificMap = mapId ? specificMapById[mapId] : null;
            const highlight = specificMap && (activeId === specificMap.id || hoveredId === specificMap.id);

            context.beginPath();
            path(feature);
            context.fillStyle   = highlight ? "#fde047" : (specificMap ? specificMap.globeColor : GENERIC_EU_COLOR);
            context.fill();
            context.strokeStyle = highlight ? "#fef9c3" : "#ffffff";
            context.lineWidth   = highlight ? 2 : 0.8;
            context.stroke();
          });

          const rotation = projection.rotate();
          specificMaps.forEach(m => drawMapLabel(m, rotation, projection, context, 15));
        }

        // ── Cached night-shadow + specular highlight overlay ───────
        context.drawImage(foregroundLayer, 0, 0, SIZE, SIZE);
      }

      // The zoom transition keeps animating on its own; a manual drag
      // reschedules itself from the pointermove handler instead.
      if (anim.active) requestRender();
    };

    requestRender();
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      visibilityObs.disconnect();
    };
  }, [globeRegions]);

  // Event handlers
  useEffect(() => {
    const canvas = canvasRef.current;

    const hitProjection = () => {
      const { scale, rotX, rotY } = projStateRef.current;
      return d3.geoOrthographic()
        .translate([CENTER, CENTER])
        .scale(scale)
        .clipAngle(90)
        .rotate([rotX, rotY, 0]);
    };

    const getMapAtEvent = (event) => {
      const rect   = canvas.getBoundingClientRect();
      const x      = ((event.clientX - rect.left) / rect.width)  * SIZE;
      const y      = ((event.clientY - rect.top)  / rect.height) * SIZE;
      const proj   = hitProjection();
      const coords = proj.invert([x, y]);
      if (!coords) return null;

      const currentGroup = globeGroupRef.current;

      if (currentGroup === "europe") {
        const specific = globeRegions
          .filter(m => HIDDEN_IN_WORLD.has(m.id))
          .find(m => d3.geoContains(m.simplifiedGeoData, coords));
        if (specific) return specific;

        const europeMap = globeRegions.find(m => m.id === "europe");
        if (europeMap && d3.geoContains(europeMap.simplifiedGeoData, coords)) return europeMap;
        return null;
      }

      return globeRegions
        .filter(m => !HIDDEN_IN_WORLD.has(m.id))
        .find(m => d3.geoContains(m.simplifiedGeoData, coords)) ?? null;
    };

    const handlePointerDown = (event) => {
      if (animRef.current.active) return;
      canvas.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        dragging: true,
        lastX: event.clientX,
        lastY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      canvas.style.cursor = "grabbing";
    };

    const handlePointerMove = (event) => {
      const drag = dragStateRef.current;

      if (drag.dragging) {
        const dx = event.clientX - drag.lastX;
        const dy = event.clientY - drag.lastY;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;

        if (!drag.moved) {
          const totalDist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
          if (totalDist > 4) drag.moved = true;
        }

        const proj = projStateRef.current;
        const degreesPerPixel = DRAG_DEGREES_AT_SCALE / proj.scale;
        proj.rotX += dx * degreesPerPixel;
        proj.rotY = clamp(proj.rotY - dy * degreesPerPixel, -MAX_TILT, MAX_TILT);
        requestRenderRef.current();
        return;
      }

      const map          = getMapAtEvent(event);
      const currentGroup = globeGroupRef.current;

      const highlightable = map && (currentGroup !== "europe" || HIDDEN_IN_WORLD.has(map.id));
      const nextId        = highlightable ? map.id : null;

      canvas.style.cursor = map ? "pointer" : "grab";
      if (hoveredRef.current !== nextId) {
        hoveredRef.current = nextId;
        requestRenderRef.current();
      }
    };

    const handlePointerUp = (event) => {
      const drag = dragStateRef.current;
      if (!drag.dragging) return;
      drag.dragging = false;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
      requestRenderRef.current(); // one more frame at full detail now that motion stopped
    };

    const handlePointerLeave = () => {
      if (dragStateRef.current.dragging) return;
      canvas.style.cursor = "grab";
      if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        requestRenderRef.current();
      }
    };

    const handleClick = (event) => {
      if (animRef.current.active) return;
      if (dragStateRef.current.moved) {
        dragStateRef.current.moved = false;
        return;
      }
      const map = getMapAtEvent(event);
      if (!map) return;

      const currentGroup = globeGroupRef.current;

      if (!currentGroup) {
        if (map.id === "europe") {
          onSelectGroupRef.current("europe");
        } else {
          onSelectMapRef.current(map.id);
        }
      } else {
        onSelectMapRef.current(map.id);
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
    };
  }, [globeRegions]);

  return (
    <div className={`world-globe-wrap${globeGroup === "europe" ? " world-globe--zoomed" : ""}`}>
      <canvas
        ref={canvasRef}
        aria-label="World map — drag to rotate, click a region to open its map editor"
        role="img"
      />
    </div>
  );
}
