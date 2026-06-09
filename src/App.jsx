import { useCallback, useEffect, useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";
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

const france = JSON.parse(franceRaw);
const italy = JSON.parse(italyRaw);
const spain = JSON.parse(spainRaw);
const greece = JSON.parse(greeceRaw);
const russia = JSON.parse(russiaRaw);
const uk = JSON.parse(ukRaw);

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
      feature.properties.name ||
      feature.properties.nom ||
      feature.properties.reg_name ||
      feature.properties.NAME ||
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

  const openStudioMap = useCallback((mapId, shouldPush = true, withTransition = false) => {
    const mapConfig = mapCatalog.find(map => map.id === mapId) || mapCatalog[0];
    const rows = createMapRows(mapConfig.geoData);

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
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0, width, height);

      const link = document.createElement("a");
      link.download = "map.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };
  const [theme, setTheme] = useState("Blues");

  if (screen === "globe" || screen === "loading") {
    return (
      <main className={`globe-page ${screen === "loading" ? "is-loading" : ""}`}>
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

        {screen === "loading" && (
          <div className="loading-overlay" aria-live="polite">
            <div className="loading-spinner"></div>
            <span>Loading map studio</span>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="app">

      {/* Sidebar */}
      <div className="sidebar">
        <button className="back-button" onClick={openGlobe}>
          Back to Globe
        </button>

        <h2>Maps</h2>

        {mapCatalog.map(map => (
          <button
            key={map.id}
            className={selectedMapConfig.id === map.id ? "selected-map-button" : ""}
            onClick={() => openStudioMap(map.id)}
          >
            {map.label}
          </button>
        ))}

        <div className="upload-section">
    <Upload onData={setData} />
  </div>
  
        <DataTable
  data={data}
  setData={setData}
/>
      </div>

      {/* Main Content */}
      <div className="main">

        {/* Map Card */}
        <div className="map-card">
          <h1>Mapify Studio</h1>

          <div className="map-container">
            <Map 
            data={mapData} 
            theme={theme} 
            geoData={selectedMapConfig.geoData} 
            mapName={selectedMapConfig.id}
            showPlaceNames={showPlaceNames}
            showPlaceValues={showPlaceValues}
            mapTitle={mapTitle}
            legendTitle={legendTitle}
            mapType={mapType}
            />
          </div>
        </div>

        {/* Controls Card */}
        <div className="controls-card">

          <Upload onData={setData} />

          <select
            onChange={(e) => setTheme(e.target.value)}
            value={theme}
          >
            <option value="Blues">Blues</option>
            <option value="Reds">Reds</option>
            <option value="Greens">Greens</option>
            <option value="Viridis">Viridis</option>
          </select>

          <button onClick={downloadImage}>
            Download Map
          </button>

        </div>

        <div className="customize-card">
          <h2>Customize Map</h2>

          <div className="map-type-group" role="radiogroup" aria-label="Map type">
            {mapTypeOptions.map(option => (
              <label
                key={option.id}
                className={`map-type-option ${mapType === option.id ? "selected" : ""}`}
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

          <label className="text-field">
            <span>Map title</span>
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="Write map title"
            />
          </label>

          <label className="text-field">
            <span>Legend title</span>
            <input
              type="text"
              value={legendTitle}
              onChange={(e) => setLegendTitle(e.target.value)}
              placeholder="Population, sales, score..."
            />
          </label>

          <label className="switch-row">
            <span>Show city/district names</span>
            <input
              type="checkbox"
              checked={showPlaceNames}
              onChange={(e) => setShowPlaceNames(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>

          <label className="switch-row">
            <span>Show assigned values</span>
            <input
              type="checkbox"
              checked={showPlaceValues}
              onChange={(e) => setShowPlaceValues(e.target.checked)}
            />
            <span className="switch" aria-hidden="true"></span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default App;
