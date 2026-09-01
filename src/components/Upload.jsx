import * as XLSX from "xlsx";

const CITY_KEYWORDS  = ["city", "name", "region", "province", "state", "country", "place", "area", "district", "il", "sehir"];
const VALUE_KEYWORDS = ["value", "count", "number", "score", "population", "amount", "total", "data", "deger", "sayi"];

function detectColumns(keys) {
  const lower = keys.map(k => k.toLowerCase().trim().replace(/[^a-z]/g, ""));

  const find = (keywords) => {
    const exact = lower.findIndex(k => keywords.includes(k));
    if (exact !== -1) return keys[exact];
    const partial = lower.findIndex(k => keywords.some(kw => k.includes(kw)));
    return partial !== -1 ? keys[partial] : null;
  };

  let cityKey  = find(CITY_KEYWORDS);
  let valueKey = find(VALUE_KEYWORDS);

  // Fallback: if neither matched, treat first col as city, second as value
  if (!cityKey && !valueKey && keys.length >= 2) {
    [cityKey, valueKey] = keys;
  } else if (!cityKey) {
    cityKey = keys.find(k => k !== valueKey) ?? keys[0];
  } else if (!valueKey) {
    valueKey = keys.find(k => k !== cityKey) ?? null;
  }

  return { cityKey, valueKey };
}

export default function Upload({ onData, onError }) {
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // defval:"" so missing cells don't vanish; raw:false keeps numbers as strings-or-numbers cleanly
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (json.length === 0) {
          onError?.("That spreadsheet doesn't have any rows.");
          return;
        }

        const { cityKey, valueKey } = detectColumns(Object.keys(json[0]));
        if (!cityKey) {
          onError?.("Couldn't find a city/region column in that spreadsheet.");
          return;
        }

        const mapped = json
          .filter(row => String(row[cityKey] ?? "").trim() !== "")
          .map(row => ({
            city:  String(row[cityKey]).trim(),
            value: valueKey != null ? row[valueKey] ?? "" : ""
          }));

        if (mapped.length > 0) {
          onData(mapped);
        } else {
          onError?.("No usable rows found in that spreadsheet.");
        }
      } catch {
        onError?.("Couldn't read that file. Make sure it's a valid .xlsx, .xls, or .csv.");
      }
    };
    reader.onerror = () => onError?.("Couldn't read that file.");

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <label className="upload-label">
      ↑ Import spreadsheet
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} hidden />
    </label>
  );
}
