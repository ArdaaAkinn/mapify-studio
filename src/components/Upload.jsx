import * as XLSX from "xlsx";

export default function Upload({ onData }) {
  const handleFile = (e) => {
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      const normalized = json.map(row => {
        const entry = {};
        Object.keys(row).forEach(k => { entry[k.trim().toLowerCase()] = row[k]; });
        return entry;
      });

      onData(normalized);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFile} />
    </div>
  );
}