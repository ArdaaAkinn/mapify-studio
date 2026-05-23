import { useEffect, useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";
import "./App.css";
import DataTable from "./components/DataTable";
import turkey from "./data/turkey.json";
import europe from "./data/europe.json";
import usa from "./data/usa.json";

const createMapRows = (selectedMap) => {
  if (!selectedMap?.features) return [];

  return selectedMap.features.map(feature => {

    const name =
      feature.properties.name ||
      feature.properties.NAME ||
      feature.properties.admin ||
      feature.properties.STATE_NAME;

    return {
      city: name,
      value: ""
    };
  });
};

function App() {
  const [selectedMap, setSelectedMap] = useState(turkey);
  const [data, setData] = useState(() => createMapRows(turkey));
  const [mapData, setMapData] = useState(data);
  const [showPlaceNames, setShowPlaceNames] = useState(false);
  const [showPlaceValues, setShowPlaceValues] = useState(false);
  const [mapTitle, setMapTitle] = useState("");
  const [legendTitle, setLegendTitle] = useState("");
  const handleMapSelect = (map) => {
    const rows = createMapRows(map);
    setSelectedMap(map);
    setData(rows);
    setMapData(rows);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMapData(data);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [data]);

  const downloadImage = () => {
    const svg = document.querySelector("svg");
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

  return (
    <div className="app">

      {/* Sidebar */}
      <div className="sidebar">
        <h2>🗺️ Maps</h2>

  <button onClick={() => handleMapSelect(turkey)}>
    Turkey
  </button>

        <button onClick={() => handleMapSelect(europe)}>
          Europe
        </button>

        <button onClick={() => handleMapSelect(usa)}>
          USA
        </button>

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
            geoData={selectedMap} 
            mapName={selectedMap === turkey ? "turkey" : selectedMap === usa ? "usa" : "europe"}
            showPlaceNames={showPlaceNames}
            showPlaceValues={showPlaceValues}
            mapTitle={mapTitle}
            legendTitle={legendTitle}
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
