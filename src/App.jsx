import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";
import LandingPage from "./components/LandingPage";
import "./App.css";
import DataTable from "./components/DataTable";
import WorldGlobe from "./components/WorldGlobe";
import Toast from "./components/Toast";

const AUTOSAVE_KEY = "mapify-studio:autosave:v1";

// Every map's geometry is fetched on demand (and cached once loaded) instead
// of bundled eagerly — keeps a deep link to a single map from downloading
// every country's data, and lets the initial JS bundle stay small.
const MAP_LOADERS = {
  turkey: () => import("./data/turkey.json").then((m) => m.default),
  europe: () => import("./data/europe.json").then((m) => m.default),
  usa: () => import("./data/usa.json").then((m) => m.default),
  canada: () => import("./data/canada.json").then((m) => m.default),
  germany: () => import("./data/germany.json").then((m) => m.default),
  france: () =>
    import("./data/france.geojson?raw").then((m) => JSON.parse(m.default)),
  italy: () =>
    import("./data/italy.geojson?raw").then((m) => JSON.parse(m.default)),
  spain: () =>
    import("./data/spain.geojson?raw").then((m) => JSON.parse(m.default)),
  greece: () =>
    import("./data/greece.geojson?raw").then((m) => JSON.parse(m.default)),
  russia: () =>
    import("./data/russia.geojson?raw").then((m) => JSON.parse(m.default)),
  uk: () =>
    import("./data/uk.geojson?raw").then((m) => JSON.parse(m.default)),
  india: () => import("./data/india.json").then((m) => m.default),
  china: () => import("./data/china.json").then((m) => m.default),
  indonesia: () => import("./data/indonesia.json").then((m) => m.default),
  brazil: () => import("./data/brazil.json").then((m) => m.default),
  "turkey-d": () =>
    import("./data/turkey-d.geojson?raw").then((m) => JSON.parse(m.default)),
  "usa-c": () =>
    import("./data/usa-c.geojson?raw").then((m) => JSON.parse(m.default)),
  "europe-n1": () =>
    import("./data/europe-n1.geojson?raw").then((m) => JSON.parse(m.default)),
  "europe-n2": () =>
    import("./data/europe-n2.geojson?raw").then((m) => JSON.parse(m.default)),
  "europe-n3": () =>
    import("./data/europe-n3.geojson?raw").then((m) => JSON.parse(m.default)),
};

const mapCatalog = [
  {
    id: "turkey",
    label: "Turkey",
    shortLabel: "Turkey",
    globeColor: "#f97316",
    labelCoordinates: [35.2, 39],
    globeRadius: 5,
  },
  {
    id: "europe",
    label: "Europe",
    shortLabel: "Europe",
    globeColor: "#22c55e",
    labelCoordinates: [14, 51],
    globeRadius: 23,
  },
  {
    id: "usa",
    label: "USA",
    shortLabel: "USA",
    globeColor: "#f43f5e",
    labelCoordinates: [-98, 39],
    globeRadius: 16,
  },
  {
    id: "canada",
    label: "Canada",
    shortLabel: "Canada",
    globeColor: "#a855f7",
    labelCoordinates: [-106, 57],
    globeRadius: 18,
  },
  {
    id: "germany",
    label: "Germany",
    shortLabel: "Germany",
    globeColor: "#14b8a6",
    labelCoordinates: [10.4, 51.1],
    globeRadius: 5,
  },
  {
    id: "france",
    label: "France",
    shortLabel: "France",
    globeColor: "#0ea5e9",
    labelCoordinates: [2.2, 46.2],
    globeRadius: 6,
  },
  {
    id: "italy",
    label: "Italy",
    shortLabel: "Italy",
    globeColor: "#84cc16",
    labelCoordinates: [12.6, 42.8],
    globeRadius: 5,
  },
  {
    id: "spain",
    label: "Spain",
    shortLabel: "Spain",
    globeColor: "#eab308",
    labelCoordinates: [-3.7, 40.4],
    globeRadius: 6,
  },
  {
    id: "greece",
    label: "Greece",
    shortLabel: "Greece",
    globeColor: "#06b6d4",
    labelCoordinates: [22, 39],
    globeRadius: 5,
  },
  {
    id: "russia",
    label: "Russia",
    shortLabel: "Russia",
    globeColor: "#ef4444",
    labelCoordinates: [40, 58],
    globeRadius: 15,
  },
  {
    id: "uk",
    label: "United Kingdom",
    shortLabel: "UK",
    globeColor: "#6366f1",
    labelCoordinates: [-2, 54],
    globeRadius: 5,
  },
  {
    id: "india",
    label: "India",
    shortLabel: "India",
    globeColor: "#f59e0b",
    labelCoordinates: [78.9, 22.5],
    globeRadius: 9,
  },
  {
    id: "china",
    label: "China",
    shortLabel: "China",
    globeColor: "#dc2626",
    labelCoordinates: [104, 35],
    globeRadius: 15,
  },
  {
    id: "indonesia",
    label: "Indonesia",
    shortLabel: "Indonesia",
    globeColor: "#0d9488",
    labelCoordinates: [118, -2],
    globeRadius: 10,
  },
  {
    id: "brazil",
    label: "Brazil",
    shortLabel: "Brazil",
    globeColor: "#4ade80",
    labelCoordinates: [-52, -14],
    globeRadius: 14,
  },
];

const paletteColors = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#475569",
];

const mapTypeOptions = [
  {
    id: "colored-regions",
    label: "Colored regions",
    description: "Fill each place by numeric value.",
  },
  {
    id: "two-color-status",
    label: "Two-color status",
    description: "Show present or absent with two colors.",
  },
  {
    id: "circles-by-value",
    label: "Circles by value",
    description: "Keep places neutral and draw sized circles.",
  },
  {
    id: "custom-color-fill",
    label: "Free color fill",
    description: "Pick a color and click regions to paint them yourself.",
  },
];

const createMapRows = (selectedMap) => {
  if (!selectedMap?.features) return [];

  return selectedMap.features.map((feature) => {
    const name =
      feature.properties.NAME_1 ||
      feature.properties.Estado ||
      feature.properties.Propinsi ||
      feature.properties.name ||
      feature.properties.Name ||
      feature.properties.nom ||
      feature.properties.reg_name ||
      feature.properties.NAME ||
      feature.properties.NUTS_NAME ||
      feature.properties.admin ||
      feature.properties.STATE_NAME ||
      feature.properties.region ||
      feature.properties.county;

    return {
      city: name,
      value: "",
    };
  });
};

const formatRelativeTime = (timestamp) => {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

function App() {
  const normalizeRegionName = (value) => {
    const aliases = {
      turkiye: "turkey",
      "bosnia and herzegovina": "bosnia and herz.",
      "bosnia & herzegovina": "bosnia and herz.",
      bosnia: "bosnia and herz.",
      bih: "bosnia and herz.",
    };

    const normalized = String(value ?? "")
      .trim()
      .replace(/İ/g, "i")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

    return aliases[normalized] ?? normalized;
  };

  const getMapIdFromPath = () => {
    const match = window.location.pathname.match(/^\/maps\/([^/]+)/);
    const mapId = match?.[1];
    return mapCatalog.some((map) => map.id === mapId) ? mapId : null;
  };

  const initialMapId = getMapIdFromPath();
  const initialMap =
    mapCatalog.find((map) => map.id === initialMapId) || mapCatalog[0];
  const [screen, setScreen] = useState(initialMapId ? "loading" : "globe");
  const [globeGroup, setGlobeGroup] = useState(null);
  const [selectedMapConfig, setSelectedMapConfig] = useState(initialMap);
  const [loadingMapConfig, setLoadingMapConfig] = useState(
    initialMapId ? initialMap : null,
  );
  const [data, setData] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [showPlaceNames, setShowPlaceNames] = useState(false);
  const [showPlaceValues, setShowPlaceValues] = useState(false);
  const [mapTitle, setMapTitle] = useState("");
  const [legendTitle, setLegendTitle] = useState("");
  const [mapType, setMapType] = useState("colored-regions");
  const [theme, setTheme] = useState("Blues");
  const [darkBackground, setDarkBackground] = useState(false);
  const [gradientMin, setGradientMin] = useState("");
  const [gradientMax, setGradientMax] = useState("");
  const [hideNoData, setHideNoData] = useState(false);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState("#2563eb");
  const [customFillByRegion, setCustomFillByRegion] = useState({});
  const [customColorLabels, setCustomColorLabels] = useState({});
  const [turkeyView, setTurkeyView] = useState("provinces");
  const [europeView, setEuropeView] = useState("countries");
  const [usaView, setUsaView] = useState("states");
  const [activeGeoData, setActiveGeoData] = useState(null);
  const [globeMapsData, setGlobeMapsData] = useState({});
  const geoCacheRef = useRef({});
  const requestedGlobeMapsRef = useRef(new Set());
  const viewRequestIdRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const [restoreCandidate, setRestoreCandidate] = useState(() => {
    if (initialMapId) return null; // an explicit /maps/:id URL always wins
    try {
      const parsed = JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
      if (
        parsed?.schemaVersion === 1 &&
        mapCatalog.some((map) => map.id === parsed.mapId)
      ) {
        return parsed;
      }
    } catch {
      // ignore corrupt autosave data
    }
    return null;
  });

  const loadGeo = useCallback(async (key) => {
    if (!geoCacheRef.current[key]) {
      geoCacheRef.current[key] = await MAP_LOADERS[key]();
    }
    return geoCacheRef.current[key];
  }, []);

  const showToast = useCallback((kind, message, opts = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message, list: opts.list }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleRegionColorClick = useCallback(
    (name) => {
      if (!name) return;

      const colorKey = normalizeRegionName(name);
      setCustomFillByRegion((prev) => {
        if (prev[colorKey] !== selectedPaletteColor) {
          return { ...prev, [colorKey]: selectedPaletteColor };
        }
        const next = { ...prev };
        delete next[colorKey];
        return next;
      });
    },
    [selectedPaletteColor],
  );

  const clearCustomColors = useCallback(() => {
    setCustomFillByRegion({});
  }, []);

  const openStudioMap = useCallback(
    async (mapId, shouldPush = true, withTransition = false) => {
      const requestId = ++viewRequestIdRef.current;
      const mapConfig =
        mapCatalog.find((map) => map.id === mapId) || mapCatalog[0];

      setLoadingMapConfig(mapConfig);
      setScreen("loading");

      const geo = await loadGeo(mapConfig.id);
      if (viewRequestIdRef.current !== requestId) return;

      const rows = createMapRows(geo);
      setTurkeyView("provinces");
      setEuropeView("countries");
      setUsaView("states");
      setActiveGeoData(geo);

      const showStudio = () => {
        setSelectedMapConfig(mapConfig);
        setData(rows);
        setMapData(rows);
        setCustomFillByRegion({});
        setCustomColorLabels({});
        setLoadingMapConfig(null);
        setScreen("studio");

        if (shouldPush) {
          window.history.pushState(
            { mapId: mapConfig.id },
            "",
            `/maps/${mapConfig.id}`,
          );
        }
      };

      if (withTransition) {
        window.setTimeout(showStudio, 650);
      } else {
        showStudio();
      }
    },
    [loadGeo],
  );

  const openGlobe = () => {
    setScreen("globe");
    setGlobeGroup(null);
    window.history.pushState({}, "", "/");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMapData(data);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [data]);

  // Deep link straight into a map's studio (e.g. /maps/brazil) — only that
  // map's geometry needs to be fetched, not the whole catalog.
  useEffect(() => {
    if (initialMapId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async fetch; loading state is the intended first render
      openStudioMap(initialMapId, false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The globe screen needs every map's geometry to draw its clickable regions,
  // so fetch the whole catalog (once, cached) whenever the globe is shown —
  // maps stream in and are drawn as each one resolves.
  useEffect(() => {
    if (screen !== "globe") return;
    mapCatalog.forEach((map) => {
      if (requestedGlobeMapsRef.current.has(map.id)) return;
      requestedGlobeMapsRef.current.add(map.id);
      loadGeo(map.id).then((geo) => {
        setGlobeMapsData((prev) => ({ ...prev, [map.id]: geo }));
      });
    });
  }, [screen, loadGeo]);

  useEffect(() => {
    const handlePopState = () => {
      const mapId = getMapIdFromPath();

      if (mapId) {
        openStudioMap(mapId, false);
      } else {
        setScreen("globe");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [openStudioMap]);

  const switchTurkeyView = useCallback(
    async (view) => {
      const requestId = ++viewRequestIdRef.current;
      setTurkeyView(view);
      const geo = await loadGeo(view === "districts" ? "turkey-d" : "turkey");
      if (viewRequestIdRef.current !== requestId) return;
      const rows = createMapRows(geo);
      setActiveGeoData(geo);
      setData(rows);
      setMapData(rows);
      return rows;
    },
    [loadGeo],
  );

  const switchEuropeView = useCallback(
    async (view) => {
      const requestId = ++viewRequestIdRef.current;
      setEuropeView(view);
      const keyMap = {
        nuts1: "europe-n1",
        nuts2: "europe-n2",
        nuts3: "europe-n3",
      };
      const geo = await loadGeo(view !== "countries" ? keyMap[view] : "europe");
      if (viewRequestIdRef.current !== requestId) return;
      const rows = createMapRows(geo);
      setActiveGeoData(geo);
      setData(rows);
      setMapData(rows);
      return rows;
    },
    [loadGeo],
  );

  const switchUsaView = useCallback(
    async (view) => {
      const requestId = ++viewRequestIdRef.current;
      setUsaView(view);
      const geo = await loadGeo(view === "counties" ? "usa-c" : "usa");
      if (viewRequestIdRef.current !== requestId) return;
      const rows = createMapRows(geo);
      setActiveGeoData(geo);
      setData(rows);
      setMapData(rows);
      return rows;
    },
    [loadGeo],
  );

  const serializeProject = useCallback(
    () => ({
      schemaVersion: 1,
      savedAt: Date.now(),
      mapId: selectedMapConfig.id,
      turkeyView,
      europeView,
      usaView,
      data,
      mapTitle,
      legendTitle,
      mapType,
      theme,
      darkBackground,
      gradientMin,
      gradientMax,
      hideNoData,
      showPlaceNames,
      showPlaceValues,
      customFillByRegion,
      customColorLabels,
    }),
    [
      selectedMapConfig,
      turkeyView,
      europeView,
      usaView,
      data,
      mapTitle,
      legendTitle,
      mapType,
      theme,
      darkBackground,
      gradientMin,
      gradientMax,
      hideNoData,
      showPlaceNames,
      showPlaceValues,
      customFillByRegion,
      customColorLabels,
    ],
  );

  const applyProject = useCallback(
    async (project, shouldPush) => {
      const mapConfig = mapCatalog.find((map) => map.id === project.mapId);
      if (!mapConfig) {
        showToast("error", `Unknown map "${project.mapId}" in project file.`);
        return;
      }

      await openStudioMap(mapConfig.id, shouldPush, false);

      let rows;
      if (mapConfig.id === "turkey" && project.turkeyView === "districts") {
        rows = await switchTurkeyView("districts");
      } else if (mapConfig.id === "usa" && project.usaView === "counties") {
        rows = await switchUsaView("counties");
      } else if (
        mapConfig.id === "europe" &&
        project.europeView &&
        project.europeView !== "countries"
      ) {
        rows = await switchEuropeView(project.europeView);
      } else {
        rows = createMapRows(await loadGeo(mapConfig.id));
      }
      if (!rows) return; // a newer switch/import started while we were awaiting a drilldown fetch

      const savedByKey = {};
      const originalNameByKey = {};
      (project.data || []).forEach((r) => {
        if (!r.city) return;
        const key = normalizeRegionName(r.city);
        savedByKey[key] = r.value;
        if (!(key in originalNameByKey)) originalNameByKey[key] = r.city;
      });
      const rowKeys = new Set(rows.map((r) => normalizeRegionName(r.city)));
      const merged = rows.map((row) => {
        const key = normalizeRegionName(row.city);
        return key in savedByKey ? { ...row, value: savedByKey[key] } : row;
      });
      setData(merged);
      setMapData(merged);

      setMapTitle(project.mapTitle ?? "");
      setLegendTitle(project.legendTitle ?? "");
      setMapType(project.mapType ?? "colored-regions");
      setTheme(project.theme ?? "Blues");
      setDarkBackground(!!project.darkBackground);
      setGradientMin(project.gradientMin ?? "");
      setGradientMax(project.gradientMax ?? "");
      setHideNoData(!!project.hideNoData);
      setShowPlaceNames(!!project.showPlaceNames);
      setShowPlaceValues(!!project.showPlaceValues);
      setCustomFillByRegion(project.customFillByRegion ?? {});
      setCustomColorLabels(project.customColorLabels ?? {});

      const unmatchedNames = Object.keys(savedByKey)
        .filter((k) => !rowKeys.has(k))
        .map((k) => originalNameByKey[k]);
      const matchedCount =
        Object.keys(savedByKey).length - unmatchedNames.length;
      showToast(
        unmatchedNames.length ? "warning" : "success",
        `Loaded "${mapConfig.label}" — ${matchedCount} value${matchedCount === 1 ? "" : "s"} restored${unmatchedNames.length ? `, ${unmatchedNames.length} row(s) no longer match a region` : ""}.`,
        { list: unmatchedNames },
      );
    },
    [
      openStudioMap,
      switchTurkeyView,
      switchEuropeView,
      switchUsaView,
      loadGeo,
      showToast,
    ],
  );

  useEffect(() => {
    if (screen !== "studio") return;
    const hasContent =
      data.some((r) => r.value) ||
      Object.keys(customFillByRegion).length > 0 ||
      Object.keys(customColorLabels).length > 0 ||
      mapTitle.trim() ||
      legendTitle.trim();
    if (!hasContent) return;

    const timer = window.setTimeout(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializeProject()));
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    data,
    mapTitle,
    legendTitle,
    mapType,
    theme,
    darkBackground,
    gradientMin,
    gradientMax,
    hideNoData,
    showPlaceNames,
    showPlaceValues,
    customFillByRegion,
    customColorLabels,
    turkeyView,
    europeView,
    usaView,
    screen,
    selectedMapConfig,
    serializeProject,
  ]);

  const exportProjectFile = () => {
    const blob = new Blob([JSON.stringify(serializeProject(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMapConfig.id}-project.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "Project exported.");
  };

  const importProjectFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        applyProject(parsed, true);
      } catch {
        showToast("error", "Couldn't read that project file.");
      }
    };
    reader.readAsText(file);
  };

  const getSerializedSvg = () => {
    const svg = document.querySelector(".map-container svg");
    if (!svg) return null;

    const width = 800;
    const height = 600;
    const serializer = new XMLSerializer();
    const clonedSvg = svg.cloneNode(true);

    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", width);
    clonedSvg.setAttribute("height", height);
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    return { source: serializer.serializeToString(clonedSvg), width, height };
  };

  const downloadPng = () => {
    const serialized = getSerializedSvg();
    if (!serialized) return;
    const { source, width, height } = serialized;
    const scale = 4;

    const image = new Image();
    image.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = darkBackground ? "#0f172a" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0, width, height);

      const link = document.createElement("a");
      link.download = "map.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  const downloadSvg = () => {
    const serialized = getSerializedSvg();
    if (!serialized) return;

    const blob = new Blob([serialized.source], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "map.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const globeCatalog = useMemo(
    () =>
      mapCatalog
        .filter((map) => globeMapsData[map.id])
        .map((map) => ({ ...map, geoData: globeMapsData[map.id] })),
    [globeMapsData],
  );

  if (screen === "globe" || screen === "loading") {
    return (
      <main
        className={`globe-page ${screen === "loading" ? "is-loading" : ""}`}
      >
        <div className="globe-hero">
          <section className="globe-panel">
            <div className="globe-copy">
              {screen === "globe" && restoreCandidate && (
                <div className="restore-banner">
                  <span className="restore-banner-icon">↺</span>
                  <div className="restore-banner-text">
                    <strong>
                      Resume "
                      {mapCatalog.find((m) => m.id === restoreCandidate.mapId)
                        ?.label ?? restoreCandidate.mapId}
                      "
                    </strong>
                    <span>
                      Autosaved {formatRelativeTime(restoreCandidate.savedAt)}
                    </span>
                  </div>
                  <div className="restore-banner-actions">
                    <button
                      className="restore-banner-resume"
                      onClick={() => {
                        applyProject(restoreCandidate, true);
                        setRestoreCandidate(null);
                      }}
                    >
                      Resume
                    </button>
                    <button
                      className="restore-banner-dismiss"
                      onClick={() => setRestoreCandidate(null)}
                    >
                      Dismiss
                    </button>
                    <button
                      className="restore-banner-discard"
                      onClick={() => {
                        localStorage.removeItem(AUTOSAVE_KEY);
                        setRestoreCandidate(null);
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
              <p className="globe-kicker">Mapify Studio</p>
              <h1>
                {screen === "loading"
                  ? `Opening ${loadingMapConfig?.label}`
                  : globeGroup === "europe"
                    ? "Choose a European map"
                    : "Choose a map from the world"}
              </h1>
              <p>
                {screen === "loading"
                  ? "Preparing the editor with the map, data table, and customization controls."
                  : globeGroup === "europe"
                    ? "Click a country on the globe or pick from the list below."
                    : "Click an available region on the rotating earth to open its map editor."}
              </p>
              {globeGroup === "europe" && screen !== "loading" && (
                <button
                  className="back-to-world-btn"
                  onClick={() => setGlobeGroup(null)}
                >
                  ← All regions
                </button>
              )}
            </div>

            <WorldGlobe
              maps={globeCatalog}
              onSelectMap={(mapId) => openStudioMap(mapId, true, true)}
              onSelectGroup={(group) => setGlobeGroup(group)}
              activeMapId={loadingMapConfig?.id}
              globeGroup={globeGroup}
            />

            <div className="globe-map-list" aria-label="Available maps">
              {(globeGroup === "europe"
                ? mapCatalog.filter((m) =>
                    [
                      "europe",
                      "germany",
                      "france",
                      "italy",
                      "spain",
                      "greece",
                      "turkey",
                      "russia",
                      "uk",
                    ].includes(m.id),
                  )
                : mapCatalog.filter(
                    (m) =>
                      ![
                        "germany",
                        "france",
                        "italy",
                        "spain",
                        "greece",
                        "turkey",
                        "russia",
                        "uk",
                      ].includes(m.id),
                  )
              ).map((map) => (
                <button
                  key={map.id}
                  onClick={() =>
                    !globeGroup && map.id === "europe"
                      ? setGlobeGroup("europe")
                      : openStudioMap(map.id, true, true)
                  }
                  disabled={screen === "loading"}
                >
                  {map.label}
                </button>
              ))}
            </div>
          </section>

          {screen === "globe" && (
            <button
              className="scroll-hint"
              aria-label="Scroll down"
              onClick={() =>
                document
                  .querySelector(".landing-page")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <span>Learn more</span>
              <span className="scroll-chevron">↓</span>
            </button>
          )}
        </div>

        {screen === "loading" && (
          <div className="loading-overlay" aria-live="polite">
            <div className="loading-spinner"></div>
            <span>Loading map studio</span>
          </div>
        )}

        {screen === "globe" && (
          <LandingPage
            onGetStarted={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        )}

        <Toast toasts={toasts} onDismiss={dismissToast} />
      </main>
    );
  }

  return (
    <div className="app">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar — navigation only */}
      <aside className="sidebar">
        <button className="back-button" onClick={openGlobe}>
          ← Globe
        </button>
        <p className="nav-label">Maps</p>
        <nav>
          {mapCatalog.map((map) => (
            <button
              key={map.id}
              className={`map-nav-btn${selectedMapConfig.id === map.id ? " active" : ""}`}
              onClick={() => openStudioMap(map.id)}
            >
              <span
                className="map-nav-dot"
                style={{ background: map.globeColor }}
              />
              {map.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Editor area — map + data table */}
      <div className="editor-area">
        <div className="map-card">
          <div className="map-card-header">
            <h2 className="map-card-title">{selectedMapConfig.label}</h2>
            {selectedMapConfig.id === "turkey" && (
              <div className="map-view-tabs">
                <button
                  className={`map-view-tab${turkeyView === "provinces" ? " active" : ""}`}
                  onClick={() => switchTurkeyView("provinces")}
                >
                  Provinces
                </button>
                <button
                  className={`map-view-tab${turkeyView === "districts" ? " active" : ""}`}
                  onClick={() => switchTurkeyView("districts")}
                >
                  Districts
                </button>
              </div>
            )}
            {selectedMapConfig.id === "usa" && (
              <div className="map-view-tabs">
                <button
                  className={`map-view-tab${usaView === "states" ? " active" : ""}`}
                  onClick={() => switchUsaView("states")}
                >
                  States
                </button>
                <button
                  className={`map-view-tab${usaView === "counties" ? " active" : ""}`}
                  onClick={() => switchUsaView("counties")}
                >
                  Counties
                </button>
              </div>
            )}
            {selectedMapConfig.id === "europe" && (
              <div className="map-view-tabs">
                <button
                  className={`map-view-tab${europeView === "countries" ? " active" : ""}`}
                  onClick={() => switchEuropeView("countries")}
                >
                  Countries
                </button>
                <button
                  className={`map-view-tab${europeView === "nuts1" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts1")}
                >
                  NUTS-1
                </button>
                <button
                  className={`map-view-tab${europeView === "nuts2" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts2")}
                >
                  NUTS-2
                </button>
                <button
                  className={`map-view-tab${europeView === "nuts3" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts3")}
                >
                  NUTS-3
                </button>
              </div>
            )}
          </div>
          <div className={`map-container${darkBackground ? " dark-bg" : ""}`}>
            <Map
              data={mapData}
              theme={theme}
              geoData={activeGeoData}
              mapName={selectedMapConfig.id}
              showPlaceNames={showPlaceNames}
              showPlaceValues={showPlaceValues}
              mapTitle={mapTitle}
              legendTitle={legendTitle}
              mapType={mapType}
              darkBackground={darkBackground}
              gradientMin={gradientMin}
              gradientMax={gradientMax}
              hideNoData={hideNoData}
              customFillByRegion={customFillByRegion}
              customColorLabels={customColorLabels}
              onRegionClick={handleRegionColorClick}
            />
          </div>
        </div>

        <div className="data-panel">
          <DataTable
            data={data}
            setData={setData}
            mapLabel={selectedMapConfig.shortLabel}
          />
        </div>
      </div>

      {/* Controls panel — all settings */}
      <aside className="controls-panel">
        <div className="panel-section">
          <h3 className="panel-section-title">Map type</h3>
          <div className="map-type-group">
            {mapTypeOptions.map((option) => (
              <label
                key={option.id}
                className={`map-type-option${mapType === option.id ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="mapType"
                  value={option.id}
                  checked={mapType === option.id}
                  onChange={(e) => setMapType(e.target.value)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3 className="panel-section-title">Appearance</h3>
          {mapType === "custom-color-fill" && (
            <label className="text-field">
              <div className="palette-label-row-header">
                <span>Color palette</span>
                <button
                  type="button"
                  className="clear-colors-btn"
                  onClick={clearCustomColors}
                  disabled={Object.keys(customFillByRegion).length === 0}
                >
                  Clear all colors
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "6px",
                }}
              >
                {paletteColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedPaletteColor(color)}
                    aria-label={`Choose ${color}`}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      border:
                        selectedPaletteColor === color
                          ? "2px solid #111827"
                          : "1px solid rgba(148,163,184,0.65)",
                      background: color,
                      boxShadow:
                        selectedPaletteColor === color
                          ? "0 0 0 3px rgba(148,163,184,0.35)"
                          : "none",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              <small
                style={{ color: "#475569", marginTop: "6px", display: "block" }}
              >
                Pick a color, then click a region to paint it — click a painted
                region again with the same color selected to erase it. Used
                colors appear in the legend.
              </small>
            </label>
          )}
          {mapType === "custom-color-fill" && (
            <label className="text-field">
              <span>Color labels</span>
              <div className="palette-label-list">
                {paletteColors.map((color) => (
                  <div key={color} className="palette-label-row">
                    <span
                      className="palette-label-swatch"
                      style={{ background: color }}
                    />
                    <input
                      type="text"
                      value={customColorLabels[color] ?? ""}
                      onChange={(e) =>
                        setCustomColorLabels((prev) => ({
                          ...prev,
                          [color]: e.target.value,
                        }))
                      }
                      placeholder="Label this color"
                    />
                  </div>
                ))}
              </div>
            </label>
          )}
          <label className="switch-row">
            <span>Dark background</span>
            <input
              type="checkbox"
              checked={darkBackground}
              onChange={(e) => setDarkBackground(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>
          <label className="switch-row">
            <span>Hide regions with no data</span>
            <input
              type="checkbox"
              checked={hideNoData}
              onChange={(e) => setHideNoData(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>
          <label className="text-field">
            <span>Color theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="Blues">Blues</option>
              <option value="Reds">Reds</option>
              <option value="Greens">Greens</option>
              <option value="Viridis">Viridis</option>
            </select>
          </label>
          {mapType === "colored-regions" && (
            <div className="gradient-range-row">
              <label className="text-field text-field--half">
                <span>Gradient min</span>
                <input
                  type="number"
                  value={gradientMin}
                  onChange={(e) => setGradientMin(e.target.value)}
                  placeholder="Auto"
                />
              </label>
              <label className="text-field text-field--half">
                <span>Gradient max</span>
                <input
                  type="number"
                  value={gradientMax}
                  onChange={(e) => setGradientMax(e.target.value)}
                  placeholder="Auto"
                />
              </label>
            </div>
          )}
          <label className="text-field">
            <span>Map title</span>
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="Add a map title"
            />
          </label>
          <label className="text-field">
            <span>Legend title</span>
            <input
              type="text"
              value={legendTitle}
              onChange={(e) => setLegendTitle(e.target.value)}
              placeholder="Population, sales, score…"
            />
          </label>
        </div>

        <div className="panel-section">
          <h3 className="panel-section-title">Labels</h3>
          <label className="switch-row">
            <span>Show place names</span>
            <input
              type="checkbox"
              checked={showPlaceNames}
              onChange={(e) => setShowPlaceNames(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>
          <label className="switch-row">
            <span>Show values</span>
            <input
              type="checkbox"
              checked={showPlaceValues}
              onChange={(e) => setShowPlaceValues(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>
        </div>

        <div className="panel-section">
          <div className="panel-section-title-row">
            <h3 className="panel-section-title">Data &amp; Export</h3>
            <span className="upload-info">
              <span className="upload-info-tooltip">
                Deleting unuseful texts/headings would help the importation of
                the data.
              </span>
            </span>
          </div>
          <Upload
            onData={(imported) => {
              const importMap = {};
              const originalNameByKey = {};
              imported.forEach((row) => {
                if (!row.city) return;
                const key = normalizeRegionName(row.city);
                importMap[key] = row.value;
                if (!(key in originalNameByKey))
                  originalNameByKey[key] = row.city;
              });

              const existingKeys = new Set(
                data.map((row) => normalizeRegionName(row.city)),
              );
              const unmatchedNames = Object.keys(importMap)
                .filter((key) => !existingKeys.has(key))
                .map((key) => originalNameByKey[key]);
              const matchedCount =
                Object.keys(importMap).length - unmatchedNames.length;

              setData((prev) =>
                prev.map((row) => {
                  const key = normalizeRegionName(row.city);
                  return key in importMap
                    ? { ...row, value: importMap[key] }
                    : row;
                }),
              );

              showToast(
                unmatchedNames.length ? "warning" : "success",
                `Imported ${matchedCount} place${matchedCount === 1 ? "" : "s"}.${unmatchedNames.length ? ` ${unmatchedNames.length} row(s) didn't match a region on this map.` : ""}`,
                { list: unmatchedNames },
              );
            }}
            onError={(message) => showToast("error", message)}
          />

          <div className="export-btn-row">
            <button className="download-btn" onClick={downloadPng}>
              ↓ PNG
            </button>
            <button className="download-btn secondary" onClick={downloadSvg}>
              ↓ SVG
            </button>
          </div>

          <div className="project-btn-row">
            <button
              className="download-btn secondary"
              onClick={exportProjectFile}
            >
              ⬇ Export project
            </button>
            <label className="upload-label project-import-label">
              ⬆ Import project
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) importProjectFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;
