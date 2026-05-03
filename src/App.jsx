import { useState } from "react";
import Map from "./components/Map";
import Upload from "./components/Upload";

function App() {
  const [data, setData] = useState([]);
  return (
    <div>
      <h1>Mapify Studio</h1>

      <Upload onData={setData} />

      <Map data={data} />
    </div>
  );
}

export default App;