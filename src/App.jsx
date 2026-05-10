import { useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";
import "./App.css";
import DataTable from "./components/DataTable";
import turkey from "./data/turkey.json";
import europe from "./data/europe.json";
import usa from "./data/usa.json";
import { useEffect } from "react";

function App() {
  const [data, setData] = useState([]);
  const [selectedMap, setSelectedMap] = useState(turkey);
  useEffect(() => {

  if (!selectedMap?.features) return;

  const generatedData = selectedMap.features.map(feature => {

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

  setData(generatedData);

}, [selectedMap]);
  const downloadImage = () => {
    const svg = document.querySelector("svg");
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);

    const image = new Image();
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 500;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

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

  <button onClick={() => setSelectedMap(turkey)}>
    Turkey
  </button>

        <button onClick={() => setSelectedMap(europe)}>
          Europe
        </button>

        <button onClick={() => setSelectedMap(usa)}>
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
            data={data} 
            theme={theme} 
            geoData={selectedMap} 
            mapName={selectedMap === turkey ? "turkey" : selectedMap === usa ? "usa" : "europe"}
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
      </div>
    </div>
  );
}

export default App;