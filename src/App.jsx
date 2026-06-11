import { useCallback, useEffect, useRef, useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";
import LandingPage from "./components/LandingPage";
import "./App.css";
import DataTable from "./components/DataTable";
import WorldGlobe from "./components/WorldGlobe";
import turkey from "./data/turkey.json";
import europe from "./data/europe.json";
import usa from "./data/usa.json";
import canada from "./data/canada.json";
import germany from "./data/germany.json";
import franceRaw from "./data/france.geojson?raw";
import italyRaw from "./data/italy.geojson?raw";
import spainRaw from "./data/spain.geojson?raw";
import greeceRaw from "./data/greece.geojson?raw";
import russiaRaw from "./data/russia.geojson?raw";
import ukRaw from "./data/uk.geojson?raw";
import india from "./data/india.json";
import china from "./data/china.json";
import indonesia from "./data/indonesia.json";
import brazil from "./data/brazil.json";
const france = JSON.parse(franceRaw);
const italy  = JSON.parse(italyRaw);
const spain  = JSON.parse(spainRaw);
const greece = JSON.parse(greeceRaw);
const russia = JSON.parse(russiaRaw);
const uk     = JSON.parse(ukRaw);

// Drill-down maps loaded on first use and cached — keeps startup fast
const DRILLDOWN_LOADERS = {
  "turkey-d":  () => import("./data/turkey-d.geojson?raw").then(m => JSON.parse(m.default)),
  "usa-c":     () => import("./data/usa-c.geojson?raw").then(m => JSON.parse(m.default)),
  "europe-n1": () => import("./data/europe-n1.geojson?raw").then(m => JSON.parse(m.default)),
  "europe-n2": () => import("./data/europe-n2.geojson?raw").then(m => JSON.parse(m.default)),
  "europe-n3": () => import("./data/europe-n3.geojson?raw").then(m => JSON.parse(m.default)),
};

const mapCatalog = [
  {
    id: "turkey",
    label: "Turkey",
    shortLabel: "Turkey",
    geoData: turkey,
    globeColor: "#f97316",
    labelCoordinates: [35.2, 39],
    globeRadius: 5
  },
  {
    id: "europe",
    label: "Europe",
    shortLabel: "Europe",
    geoData: europe,
    globeColor: "#22c55e",
    labelCoordinates: [14, 51],
    globeRadius: 23
  },
  {
    id: "usa",
    label: "USA",
    shortLabel: "USA",
    geoData: usa,
    globeColor: "#f43f5e",
    labelCoordinates: [-98, 39],
    globeRadius: 16
  },
  {
    id: "canada",
    label: "Canada",
    shortLabel: "Canada",
    geoData: canada,
    globeColor: "#a855f7",
    labelCoordinates: [-106, 57],
    globeRadius: 18
  },
  {
    id: "germany",
    label: "Germany",
    shortLabel: "Germany",
    geoData: germany,
    globeColor: "#14b8a6",
    labelCoordinates: [10.4, 51.1],
    globeRadius: 5
  },
  {
    id: "france",
    label: "France",
    shortLabel: "France",
    geoData: france,
    globeColor: "#0ea5e9",
    labelCoordinates: [2.2, 46.2],
    globeRadius: 6
  },
  {
    id: "italy",
    label: "Italy",
    shortLabel: "Italy",
    geoData: italy,
    globeColor: "#84cc16",
    labelCoordinates: [12.6, 42.8],
    globeRadius: 5
  },
  {
    id: "spain",
    label: "Spain",
    shortLabel: "Spain",
    geoData: spain,
    globeColor: "#eab308",
    labelCoordinates: [-3.7, 40.4],
    globeRadius: 6
  },
  {
    id: "greece",
    label: "Greece",
    shortLabel: "Greece",
    geoData: greece,
    globeColor: "#06b6d4",
    labelCoordinates: [22, 39],
    globeRadius: 5
  },
  {
    id: "russia",
    label: "Russia",
    shortLabel: "Russia",
    geoData: russia,
    globeColor: "#ef4444",
    labelCoordinates: [40, 58],
    globeRadius: 15
  },
  {
    id: "uk",
    label: "United Kingdom",
    shortLabel: "UK",
    geoData: uk,
    globeColor: "#6366f1",
    labelCoordinates: [-2, 54],
    globeRadius: 5
  },
  {
    id: "india",
    label: "India",
    shortLabel: "India",
    geoData: india,
    globeColor: "#f59e0b",
    labelCoordinates: [78.9, 22.5],
    globeRadius: 9
  },
  {
    id: "china",
    label: "China",
    shortLabel: "China",
    geoData: china,
    globeColor: "#dc2626",
    labelCoordinates: [104, 35],
    globeRadius: 15
  },
  {
    id: "indonesia",
    label: "Indonesia",
    shortLabel: "Indonesia",
    geoData: indonesia,
    globeColor: "#0d9488",
    labelCoordinates: [118, -2],
    globeRadius: 10
  },
  {
    id: "brazil",
    label: "Brazil",
    shortLabel: "Brazil",
    geoData: brazil,
    globeColor: "#4ade80",
    labelCoordinates: [-52, -14],
    globeRadius: 14
  }
];

const mapTypeOptions = [
  {
    id: "colored-regions",
    label: "Colored regions",
    description: "Fill each place by numeric value."
  },
  {
    id: "two-color-status",
    label: "Two-color status",
    description: "Show present or absent with two colors."
  },
  {
    id: "circles-by-value",
    label: "Circles by value",
    description: "Keep places neutral and draw sized circles."
  }
];

const createMapRows = (selectedMap) => {
  if (!selectedMap?.features) return [];

  return selectedMap.features.map(feature => {
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
      value: ""
    };
  });
};

function App() {
  const getMapIdFromPath = () => {
    const match = window.location.pathname.match(/^\/maps\/([^/]+)/);
    const mapId = match?.[1];
    return mapCatalog.some(map => map.id === mapId) ? mapId : null;
  };

  const initialMapId = getMapIdFromPath();
  const initialMap = mapCatalog.find(map => map.id === initialMapId) || mapCatalog[0];
  const [screen, setScreen] = useState(initialMapId ? "studio" : "globe");
  const [globeGroup, setGlobeGroup] = useState(null);
  const [selectedMapConfig, setSelectedMapConfig] = useState(initialMap);
  const [loadingMapConfig, setLoadingMapConfig] = useState(null);
  const [data, setData] = useState(() => createMapRows(initialMap.geoData));
  const [mapData, setMapData] = useState(data);
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
  const [turkeyView, setTurkeyView] = useState("provinces");
  const [europeView, setEuropeView] = useState("countries");
  const [usaView, setUsaView] = useState("states");
  const [activeGeoData, setActiveGeoData] = useState(initialMap.geoData);
  const drilldownCacheRef = useRef({});

  const loadDrilldown = useCallback(async (key) => {
    if (!drilldownCacheRef.current[key]) {
      drilldownCacheRef.current[key] = await DRILLDOWN_LOADERS[key]();
    }
    return drilldownCacheRef.current[key];
  }, []);

  const openStudioMap = useCallback((mapId, shouldPush = true, withTransition = false) => {
    const mapConfig = mapCatalog.find(map => map.id === mapId) || mapCatalog[0];
    const rows = createMapRows(mapConfig.geoData);
    setTurkeyView("provinces");
    setEuropeView("countries");
    setUsaView("states");
    setActiveGeoData(mapConfig.geoData);

    const showStudio = () => {
      setSelectedMapConfig(mapConfig);
      setData(rows);
      setMapData(rows);
      setLoadingMapConfig(null);
      setScreen("studio");

      if (shouldPush) {
        window.history.pushState({ mapId: mapConfig.id }, "", `/maps/${mapConfig.id}`);
      }
    };

    if (withTransition) {
      setLoadingMapConfig(mapConfig);
      setScreen("loading");
      window.setTimeout(showStudio, 650);
    } else {
      showStudio();
    }
  }, []);

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

  const switchTurkeyView = useCallback(async (view) => {
    setTurkeyView(view);
    const geo = view === "districts" ? await loadDrilldown("turkey-d") : turkey;
    const rows = createMapRows(geo);
    setActiveGeoData(geo);
    setData(rows);
    setMapData(rows);
  }, [loadDrilldown]);

  const switchEuropeView = useCallback(async (view) => {
    setEuropeView(view);
    const keyMap = { nuts1: "europe-n1", nuts2: "europe-n2", nuts3: "europe-n3" };
    const geo = view !== "countries" ? await loadDrilldown(keyMap[view]) : europe;
    const rows = createMapRows(geo);
    setActiveGeoData(geo);
    setData(rows);
    setMapData(rows);
  }, [loadDrilldown]);

  const switchUsaView = useCallback(async (view) => {
    setUsaView(view);
    const geo = view === "counties" ? await loadDrilldown("usa-c") : usa;
    const rows = createMapRows(geo);
    setActiveGeoData(geo);
    setData(rows);
    setMapData(rows);
  }, [loadDrilldown]);

  const downloadImage = () => {
    const svg = document.querySelector(".map-container svg");
    if (!svg) return;

    const width = 800;
    const height = 600;
    const scale = 4;
    const serializer = new XMLSerializer();
    const clonedSvg = svg.cloneNode(true);

    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clonedSvg.setAttribute("width", width);
    clonedSvg.setAttribute("height", height);
    clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const source = serializer.serializeToString(clonedSvg);

    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

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

  if (screen === "globe" || screen === "loading") {
    return (
      <main className={`globe-page ${screen === "loading" ? "is-loading" : ""}`}>
        <div className="globe-hero">
          <section className="globe-panel">
            <div className="globe-copy">
              <p className="globe-kicker">Mapify Studio</p>
              <h1>{screen === "loading" ? `Opening ${loadingMapConfig?.label}` : globeGroup === "europe" ? "Choose a European map" : "Choose a map from the world"}</h1>
              <p>
                {screen === "loading"
                  ? "Preparing the editor with the map, data table, and customization controls."
                  : globeGroup === "europe"
                  ? "Click a country on the globe or pick from the list below."
                  : "Click an available region on the rotating earth to open its map editor."}
              </p>
              {globeGroup === "europe" && screen !== "loading" && (
                <button className="back-to-world-btn" onClick={() => setGlobeGroup(null)}>
                  ← All regions
                </button>
              )}
            </div>

            <WorldGlobe
              maps={mapCatalog}
              onSelectMap={(mapId) => openStudioMap(mapId, true, true)}
              onSelectGroup={(group) => setGlobeGroup(group)}
              activeMapId={loadingMapConfig?.id}
              globeGroup={globeGroup}
            />

            <div className="globe-map-list" aria-label="Available maps">
              {(globeGroup === "europe"
                ? mapCatalog.filter(m => ["europe", "germany", "france", "italy", "spain", "greece", "turkey", "russia", "uk"].includes(m.id))
                : mapCatalog.filter(m => !["germany", "france", "italy", "spain", "greece", "turkey", "russia", "uk"].includes(m.id))
              ).map(map => (
                <button
                  key={map.id}
                  onClick={() => (!globeGroup && map.id === "europe") ? setGlobeGroup("europe") : openStudioMap(map.id, true, true)}
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
              onClick={() => document.querySelector(".landing-page")?.scrollIntoView({ behavior: "smooth" })}
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
      </main>
    );
  }

  return (
    <div className="app">

      {/* Sidebar — navigation only */}
      <aside className="sidebar">
        <button className="back-button" onClick={openGlobe}>← Globe</button>
        <p className="nav-label">Maps</p>
        <nav>
          {mapCatalog.map(map => (
            <button
              key={map.id}
              className={`map-nav-btn${selectedMapConfig.id === map.id ? " active" : ""}`}
              onClick={() => openStudioMap(map.id)}
            >
              <span className="map-nav-dot" style={{ background: map.globeColor }} />
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
                >Provinces</button>
                <button
                  className={`map-view-tab${turkeyView === "districts" ? " active" : ""}`}
                  onClick={() => switchTurkeyView("districts")}
                >Districts</button>
              </div>
            )}
            {selectedMapConfig.id === "usa" && (
              <div className="map-view-tabs">
                <button
                  className={`map-view-tab${usaView === "states" ? " active" : ""}`}
                  onClick={() => switchUsaView("states")}
                >States</button>
                <button
                  className={`map-view-tab${usaView === "counties" ? " active" : ""}`}
                  onClick={() => switchUsaView("counties")}
                >Counties</button>
              </div>
            )}
            {selectedMapConfig.id === "europe" && (
              <div className="map-view-tabs">
                <button
                  className={`map-view-tab${europeView === "countries" ? " active" : ""}`}
                  onClick={() => switchEuropeView("countries")}
                >Countries</button>
                <button
                  className={`map-view-tab${europeView === "nuts1" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts1")}
                >NUTS-1</button>
                <button
                  className={`map-view-tab${europeView === "nuts2" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts2")}
                >NUTS-2</button>
                <button
                  className={`map-view-tab${europeView === "nuts3" ? " active" : ""}`}
                  onClick={() => switchEuropeView("nuts3")}
                >NUTS-3</button>
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
            />
          </div>
        </div>

        <div className="data-panel">
          <DataTable data={data} setData={setData} />
        </div>
      </div>

      {/* Controls panel — all settings */}
      <aside className="controls-panel">

        <div className="panel-section">
          <h3 className="panel-section-title">Map type</h3>
          <div className="map-type-group">
            {mapTypeOptions.map(option => (
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
              ℹ
              <span className="upload-info-tooltip">
                Deleting unuseful texts/headings would help the importation of the data.
              </span>
            </span>
          </div>
          <Upload onData={(imported) => {
            const NAME_ALIASES = {
              turkiye: "turkey",
              "bosnia and herzegovina": "bosnia and herz.",
              "bosnia & herzegovina": "bosnia and herz.",
              bosnia: "bosnia and herz.",
              bih: "bosnia and herz.",
            };
            const normalizeKey = (s) => {
              const n = s?.toString().trim()
                .replace(/İ/g, "i").toLowerCase()
                .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
                .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
              return NAME_ALIASES[n] ?? n;
            };

            const importMap = {};
            imported.forEach(row => {
              if (row.city) importMap[normalizeKey(row.city)] = row.value;
            });

            setData(prev => prev.map(row => {
              const key = normalizeKey(row.city);
              return key in importMap ? { ...row, value: importMap[key] } : row;
            }));
          }} />
          <button className="download-btn" onClick={downloadImage}>↓ Download PNG</button>
        </div>

      </aside>
    </div>
  );
}

export default App;
