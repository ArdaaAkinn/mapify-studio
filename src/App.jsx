import { useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";

function App() {
  const [data, setData] = useState([]);
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
    <div>
      <h1>Mapify Studio</h1>

      <Upload onData={setData} />
      <button onClick={downloadImage}>
        Download Map
      </button>
      <label>Color Theme: </label>
      <select onChange={(e) => setTheme(e.target.value)} value={theme}>
        <option value="Blues">Blues</option>
        <option value="Reds">Reds</option>
        <option value="Greens">Greens</option>
        <option value="Viridis">Viridis</option>
      </select>

      <Map data={data} theme={theme} />
    </div>
  );
}

export default App;