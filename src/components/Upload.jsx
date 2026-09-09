import { useState } from "react";
import * as XLSX from "xlsx";
import { detectColumns } from "./detectColumns";

const PREVIEW_ROWS = 5;

export default function Upload({ onData, onError }) {
  // Pending import awaiting user confirmation of the region/value columns.
  // Shape: { rows, keys, cityKey, valueKey }
  const [pending, setPending] = useState(null);

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

        const keys = Object.keys(json[0]);
        const { cityKey, valueKey } = detectColumns(keys);
        if (!cityKey) {
          onError?.("Couldn't find a city/region column in that spreadsheet.");
          return;
        }

        setPending({ rows: json, keys, cityKey, valueKey });
      } catch {
        onError?.("Couldn't read that file. Make sure it's a valid .xlsx, .xls, or .csv.");
      }
    };
    reader.onerror = () => onError?.("Couldn't read that file.");

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const confirmImport = (cityKey, valueKey) => {
    const { rows } = pending;
    const mapped = rows
      .filter(row => String(row[cityKey] ?? "").trim() !== "")
      .map(row => ({
        city:  String(row[cityKey]).trim(),
        value: valueKey != null ? row[valueKey] ?? "" : ""
      }));

    setPending(null);

    if (mapped.length > 0) {
      onData(mapped);
    } else {
      onError?.("No usable rows found in that spreadsheet.");
    }
  };

  return (
    <>
      <label className="upload-label">
        ↑ Import spreadsheet
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} hidden />
      </label>

      {pending && (
        <ImportColumnPicker
          pending={pending}
          onCancel={() => setPending(null)}
          onConfirm={confirmImport}
        />
      )}
    </>
  );
}

function ImportColumnPicker({ pending, onCancel, onConfirm }) {
  const { rows, keys, cityKey, valueKey } = pending;
  const [region, setRegion] = useState(cityKey);
  const [value, setValue] = useState(valueKey ?? "");

  const previewRows = rows.slice(0, PREVIEW_ROWS);
  const sameColumn = value !== "" && value === region;

  return (
    <div className="import-modal-overlay" onMouseDown={onCancel}>
      <div className="import-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h3>Match your columns</h3>
          <p>We guessed which column is which — adjust them if that's wrong.</p>
        </div>

        <div className="import-modal-fields">
          <label className="text-field">
            <span>Region / city column</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="text-field">
            <span>Value column</span>
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">None — leave values blank</option>
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>

        {sameColumn && (
          <p className="import-modal-warning">
            You picked the same column for both region and value — that's probably not right.
          </p>
        )}

        <div className="import-preview-wrap">
          <table className="import-preview-table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th
                    key={k}
                    className={
                      k === region ? "import-col-region" : k === value ? "import-col-value" : ""
                    }
                  >
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i}>
                  {keys.map((k) => (
                    <td
                      key={k}
                      className={
                        k === region ? "import-col-region" : k === value ? "import-col-value" : ""
                      }
                    >
                      {String(row[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_ROWS && (
            <p className="import-preview-more">
              …and {rows.length - PREVIEW_ROWS} more row{rows.length - PREVIEW_ROWS === 1 ? "" : "s"}.
            </p>
          )}
        </div>

        <div className="import-modal-actions">
          <button className="download-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="download-btn"
            onClick={() => onConfirm(region, value === "" ? null : value)}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
