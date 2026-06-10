import { useEffect, useRef } from "react";

export default function DataTable({ data, setData }) {
  const wrapRef = useRef(null);

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

  const addRow = () => {
    setData([...data, { city: "", value: "" }]);
  };

  const clearValues = () => {
    setData(data.map(row => ({ ...row, value: "" })));
  };

  return (
    <div className="data-table" ref={wrapRef}>
      <div className="data-table-header">
        <h3>Data</h3>
        <button className="clear-values-btn" onClick={clearValues}>Clear values</button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Place</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
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
          </tbody>
        </table>
      </div>

      <button className="add-row-btn" onClick={addRow}>+ Add row</button>
    </div>
  );
}
