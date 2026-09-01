import { useEffect, useRef, useState } from "react";

export default function DataTable({ data, setData, mapLabel }) {
  const wrapRef = useRef(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onKey = (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const inputs = Array.from(wrap.querySelectorAll("tbody input:not([disabled])"));
      const idx = inputs.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? inputs[idx + 1] : inputs[idx - 1];
      next?.focus();
    };

    wrap.addEventListener("keydown", onKey);
    return () => wrap.removeEventListener("keydown", onKey);
  }, []);

  const updateCell = (index, field, value) => {
    setData(data.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row
    ));
  };

  const clearValues = () => {
    setData(data.map(row => ({ ...row, value: "" })));
  };

  const exportCsv = () => {
    const escape = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [["Place", "Value"], ...data.map(r => [r.city, r.value])];
    const blob = new Blob([rows.map(r => r.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mapLabel || "mapify"}-data.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const visibleRows = data
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => (row.city ?? "").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="data-table" ref={wrapRef}>
      <div className="data-table-header">
        <h3>Data</h3>
        <div className="data-table-header-actions">
          <button className="export-csv-btn" onClick={exportCsv}>Export CSV</button>
          <button className="clear-values-btn" onClick={clearValues}>Clear values</button>
        </div>
      </div>

      <input
        type="text"
        className="table-search"
        placeholder="Search places…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Place</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, index }) => (
              <tr key={index}>
                <td>
                  <input value={row.city ?? ""} disabled />
                </td>
                <td>
                  <input
                    value={row.value ?? ""}
                    onChange={(e) => updateCell(index, "value", e.target.value)}
                  />
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={2} className="table-no-results">No places match "{search}"</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
