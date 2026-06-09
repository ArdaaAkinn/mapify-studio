import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

const size = 760;
const center = size / 2;
const rotationSpeed = 0.0032;
const startRotation = [-25, -26, 0];

const simplifyRing = (ring, maxPoints = 80) => {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring;

  const step = Math.ceil(ring.length / maxPoints);
  const simplified = ring.filter((point, index) => (
    index === 0 || index === ring.length - 1 || index % step === 0
  ));
  const firstPoint = simplified[0];
  const lastPoint = simplified[simplified.length - 1];

  if (
    firstPoint &&
    lastPoint &&
    (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])
  ) {
    simplified.push(firstPoint);
  }

  return simplified;
};

const simplifyGeometry = (geometry) => {
  if (!geometry) return geometry;

  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(ring => simplifyRing(ring))
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(polygon => (
        polygon.map(ring => simplifyRing(ring))
      ))
    };
  }

  return geometry;
};

const simplifyGeoData = (geoData) => ({
  ...geoData,
  features: geoData.features.map(feature => ({
    ...feature,
    geometry: simplifyGeometry(feature.geometry)
  }))
});

export default function WorldGlobe({ maps, onSelectMap, activeMapId }) {
  const canvasRef = useRef();
  const onSelectMapRef = useRef(onSelectMap);
  const activeMapIdRef = useRef(activeMapId);
  const hoveredMapIdRef = useRef(null);
  const [hoveredMapId, setHoveredMapId] = useState(null);

  const globeRegions = useMemo(() => maps.map(map => ({
    ...map,
    simplifiedGeoData: simplifyGeoData(map.geoData)
  })), [maps]);

  useEffect(() => {
    onSelectMapRef.current = onSelectMap;
  }, [onSelectMap]);

  useEffect(() => {
    activeMapIdRef.current = activeMapId;
  }, [activeMapId]);

  useEffect(() => {
    hoveredMapIdRef.current = hoveredMapId;
  }, [hoveredMapId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const projection = d3.geoOrthographic()
      .translate([center, center])
      .scale(310)
      .clipAngle(90)
      .precision(0.7);

    const path = d3.geoPath(projection, context);
    const graticule = d3.geoGraticule10();
    const sphere = { type: "Sphere" };
    const startTime = performance.now();
    let animationFrame;

    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const drawPath = (geoJson, fillStyle, strokeStyle, lineWidth = 1) => {
      context.beginPath();
      path(geoJson);

      if (fillStyle) {
        context.fillStyle = fillStyle;
        context.fill();
      }

      if (strokeStyle) {
        context.strokeStyle = strokeStyle;
        context.lineWidth = lineWidth;
        context.stroke();
      }
    };

    const drawLabel = (map) => {
      const point = projection(map.labelCoordinates);
      const rotation = projection.rotate();
      const isVisible = d3.geoDistance(
        map.labelCoordinates,
        [-rotation[0], -rotation[1]]
      ) < Math.PI / 2;

      if (!point || !isVisible) return;

      context.save();
      context.font = "700 15px Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineWidth = 5;
      context.strokeStyle = "#ffffff";
      context.fillStyle = "#0f172a";
      context.strokeText(map.shortLabel, point[0], point[1] - 12);
      context.fillText(map.shortLabel, point[0], point[1] - 12);
      context.restore();
    };

    const render = (now) => {
      const elapsed = now - startTime;
      projection.rotate([
        startRotation[0] + elapsed * rotationSpeed,
        startRotation[1],
        startRotation[2]
      ]);

      context.clearRect(0, 0, size, size);

      const oceanGradient = context.createRadialGradient(
        center - 120,
        center - 150,
        20,
        center,
        center,
        326
      );
      oceanGradient.addColorStop(0, "#eff6ff");
      oceanGradient.addColorStop(0.58, "#60a5fa");
      oceanGradient.addColorStop(1, "#1d4ed8");

      context.save();
      context.shadowColor = "rgba(15, 23, 42, 0.22)";
      context.shadowBlur = 22;
      context.shadowOffsetY = 16;
      drawPath(sphere, oceanGradient);
      context.restore();

      drawPath(graticule, null, "rgba(255, 255, 255, 0.3)", 0.65);

      globeRegions.forEach((map) => {
        const isActive = activeMapIdRef.current === map.id;
        const isHovered = hoveredMapIdRef.current === map.id;

        drawPath(
          map.simplifiedGeoData,
          isActive || isHovered ? "#fde047" : map.globeColor,
          isActive || isHovered ? "#fef9c3" : "#ffffff",
          isActive || isHovered ? 2 : 0.8
        );
      });

      globeRegions.forEach(drawLabel);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, [globeRegions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const projection = d3.geoOrthographic()
      .translate([center, center])
      .scale(310)
      .clipAngle(90)
      .precision(0.7);
    const startTime = performance.now();

    const getMapAtEvent = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * size;
      const y = ((event.clientY - rect.top) / rect.height) * size;
      const elapsed = performance.now() - startTime;

      projection.rotate([
        startRotation[0] + elapsed * rotationSpeed,
        startRotation[1],
        startRotation[2]
      ]);

      const coordinates = projection.invert([x, y]);
      if (!coordinates) return null;

      return globeRegions.find((map) => d3.geoContains(map.simplifiedGeoData, coordinates));
    };

    const handlePointerMove = (event) => {
      const map = getMapAtEvent(event);
      const nextHoveredMapId = map?.id || null;

      canvas.style.cursor = map ? "pointer" : "default";
      setHoveredMapId(current => current === nextHoveredMapId ? current : nextHoveredMapId);
    };

    const handlePointerLeave = () => {
      canvas.style.cursor = "default";
      setHoveredMapId(null);
    };

    const handleClick = (event) => {
      const map = getMapAtEvent(event);

      if (map) {
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
    <canvas
      className="world-globe"
      ref={canvasRef}
      aria-label="Rotating world map with available clickable regions"
      role="img"
    />
  );
}
