import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import worldAtlasData from "world-atlas/countries-110m.json";

const worldLand = topojson.feature(worldAtlasData, worldAtlasData.objects.countries);
const worldBorders = topojson.mesh(worldAtlasData, worldAtlasData.objects.countries, (a, b) => a !== b);

const SIZE = 760;
const CENTER = SIZE / 2;
const WORLD_SCALE = 310;
const WORLD_ROT = [-25, -26];
const EUROPE_SCALE = 680;
const EUROPE_ROT = [-14, -48];
const ROTATION_SPEED = 0.0032;
const ZOOM_DURATION = 700;

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

const simplifyGeometry = (geometry) => {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon")
    return { ...geometry, coordinates: geometry.coordinates.map(r => simplifyRing(r)) };
  if (geometry.type === "MultiPolygon")
    return { ...geometry, coordinates: geometry.coordinates.map(p => p.map(r => simplifyRing(r))) };
  return geometry;
};

const simplifyGeoData = (geoData) => ({
  ...geoData,
  features: geoData.features.map(f => ({ ...f, geometry: simplifyGeometry(f.geometry) }))
});

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
  const [hoveredMapId, setHoveredMapId] = useState(null);

  const projStateRef = useRef({ scale: WORLD_SCALE, rotX: WORLD_ROT[0], rotY: WORLD_ROT[1] });

  const animRef = useRef({
    active: false,
    startTime: 0,
    fromScale: WORLD_SCALE, toScale: WORLD_SCALE,
    fromRotX: WORLD_ROT[0], toRotX: WORLD_ROT[0],
    fromRotY: WORLD_ROT[1], toRotY: WORLD_ROT[1],
  });

  const globeRegions = useMemo(() =>
    maps.map(map => ({ ...map, simplifiedGeoData: simplifyGeoData(map.geoData) })),
    [maps]
  );

  useEffect(() => { onSelectMapRef.current = onSelectMap; }, [onSelectMap]);
  useEffect(() => { onSelectGroupRef.current = onSelectGroup; }, [onSelectGroup]);
  useEffect(() => { activeMapIdRef.current = activeMapId; }, [activeMapId]);

  useEffect(() => {
    globeGroupRef.current = globeGroup;
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
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const projection = d3.geoOrthographic()
      .translate([CENTER, CENTER])
      .scale(WORLD_SCALE)
      .clipAngle(90)
      .precision(0.5);

    const path = d3.geoPath(projection, context);
    const graticule = d3.geoGraticule10();
    const sphere = { type: "Sphere" };

    // Ocean — richer gradient, light from upper-left
    const oceanGradient = context.createRadialGradient(CENTER - 130, CENTER - 160, 15, CENTER, CENTER, 340);
    oceanGradient.addColorStop(0,    "#dff0ff");
    oceanGradient.addColorStop(0.35, "#5ab8f5");
    oceanGradient.addColorStop(0.72, "#1878cc");
    oceanGradient.addColorStop(1,    "#093566");

    // Stars — fixed positions, drawn once per frame outside the sphere
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * SIZE,
      y: Math.random() * SIZE,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.65 + 0.2,
    }));

    // Europe lookup caches
    const europeRegion = globeRegions.find(m => m.id === "europe");
    const specificMaps = globeRegions.filter(m => HIDDEN_IN_WORLD.has(m.id));
    const specificMapById = Object.fromEntries(specificMaps.map(m => [m.id, m]));

    const europeFeatures = europeRegion?.simplifiedGeoData.features.map(feat => {
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

    const startTime = performance.now();
    let animationFrame;

    const render = (now) => {
      animationFrame = requestAnimationFrame(render);

      const elapsed = now - startTime;
      const anim = animRef.current;
      const proj = projStateRef.current;
      const currentGroup = globeGroupRef.current;

      // Update projection state
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
      } else if (!currentGroup) {
        proj.scale = WORLD_SCALE;
        proj.rotX  = WORLD_ROT[0] + elapsed * ROTATION_SPEED;
        proj.rotY  = WORLD_ROT[1];
      }

      projection.scale(proj.scale).rotate([proj.rotX, proj.rotY, 0]);

      const sc = proj.scale;

      // ── Clear + stars ──────────────────────────────────────────
      context.clearRect(0, 0, SIZE, SIZE);
      stars.forEach(st => {
        context.beginPath();
        context.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${st.a})`;
        context.fill();
      });

      // ── Ocean sphere ───────────────────────────────────────────
      context.save();
      context.shadowColor  = "rgba(8, 20, 80, 0.55)";
      context.shadowBlur   = 42;
      context.shadowOffsetY = 22;
      context.beginPath();
      path(sphere);
      context.fillStyle = oceanGradient;
      context.fill();
      context.restore();

      // ── Atmosphere glow (ring just outside sphere) ─────────────
      const atmoGrad = context.createRadialGradient(CENTER, CENTER, sc * 0.93, CENTER, CENTER, sc * 1.20);
      atmoGrad.addColorStop(0,    "rgba(100, 180, 255, 0)");
      atmoGrad.addColorStop(0.35, "rgba(110, 190, 255, 0.20)");
      atmoGrad.addColorStop(0.72, "rgba(80,  155, 255, 0.08)");
      atmoGrad.addColorStop(1,    "rgba(55,  120, 255, 0)");
      context.beginPath();
      context.arc(CENTER, CENTER, sc * 1.20, 0, Math.PI * 2);
      context.fillStyle = atmoGrad;
      context.fill();

      // ── Globe rim ─────────────────────────────────────────────
      context.beginPath();
      path(sphere);
      context.strokeStyle = "rgba(140, 210, 255, 0.30)";
      context.lineWidth   = 2;
      context.stroke();

      // ── Graticule ─────────────────────────────────────────────
      context.beginPath();
      path(graticule);
      context.strokeStyle = "rgba(255, 255, 255, 0.14)";
      context.lineWidth   = 0.5;
      context.stroke();

      const activeId  = activeMapIdRef.current;
      const hoveredId = hoveredRef.current;

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

        // Interactive maps on top
        globeRegions
          .filter(m => !HIDDEN_IN_WORLD.has(m.id))
          .forEach((map) => {
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
              // Sub-pixel, very low opacity — internal division lines
              // are essentially invisible at this weight
              context.strokeStyle = "rgba(255,255,255,0.18)";
              context.lineWidth   = 0.3;
              context.stroke();
            }
          });

        if (!anim.active) {
          const rotation  = projection.rotate();
          const europeMap = globeRegions.find(m => m.id === "europe");
          if (europeMap) drawMapLabel(europeMap, rotation, projection, context, 17);
          globeRegions
            .filter(m => !HIDDEN_IN_WORLD.has(m.id) && m.id !== "europe")
            .forEach(m => drawMapLabel(m, rotation, projection, context, 15));
        }

      // ── EUROPE ZOOM mode ──────────────────────────────────────
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

      // ── Night-side shadow (clipped to sphere) ─────────────────
      context.save();
      context.beginPath();
      path(sphere);
      context.clip();
      const nightGrad = context.createRadialGradient(
        CENTER + sc * 0.62, CENTER + sc * 0.12, 0,
        CENTER + sc * 0.18, CENTER,              sc * 1.28
      );
      nightGrad.addColorStop(0,    "rgba(0, 0, 18, 0.84)");
      nightGrad.addColorStop(0.28, "rgba(0, 0, 18, 0.50)");
      nightGrad.addColorStop(0.56, "rgba(0, 0, 18, 0.14)");
      nightGrad.addColorStop(1,    "rgba(0, 0, 18, 0)");
      context.beginPath();
      context.rect(0, 0, SIZE, SIZE);
      context.fillStyle = nightGrad;
      context.fill();
      context.restore();

      // ── Specular highlight (clipped to sphere) ────────────────
      context.save();
      context.beginPath();
      path(sphere);
      context.clip();
      const specGrad = context.createRadialGradient(
        CENTER - sc * 0.38, CENTER - sc * 0.44, 0,
        CENTER - sc * 0.12, CENTER - sc * 0.08, sc * 1.1
      );
      specGrad.addColorStop(0,    "rgba(255, 255, 255, 0.30)");
      specGrad.addColorStop(0.18, "rgba(255, 255, 255, 0.11)");
      specGrad.addColorStop(0.44, "rgba(255, 255, 255, 0.02)");
      specGrad.addColorStop(1,    "rgba(255, 255, 255, 0)");
      context.beginPath();
      context.rect(0, 0, SIZE, SIZE);
      context.fillStyle = specGrad;
      context.fill();
      context.restore();
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
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

    const handlePointerMove = (event) => {
      const map          = getMapAtEvent(event);
      const currentGroup = globeGroupRef.current;

      const highlightable = map && (currentGroup !== "europe" || HIDDEN_IN_WORLD.has(map.id));
      const nextId        = highlightable ? map.id : null;

      canvas.style.cursor = map ? "pointer" : "default";
      hoveredRef.current  = nextId;
      setHoveredMapId(cur => cur === nextId ? cur : nextId);
    };

    const handlePointerLeave = () => {
      canvas.style.cursor = "default";
      hoveredRef.current  = null;
      setHoveredMapId(null);
    };

    const handleClick = (event) => {
      if (animRef.current.active) return;
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

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);
    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
    };
  }, [globeRegions]);

  return (
    <div className={`world-globe-wrap${globeGroup === "europe" ? " world-globe--zoomed" : ""}`}>
      <canvas
        ref={canvasRef}
        aria-label="Rotating world map with available clickable regions"
        role="img"
      />
    </div>
  );
}
