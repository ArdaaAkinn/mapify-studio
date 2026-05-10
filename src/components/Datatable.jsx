export default function DataTable({ data, setData }) {

  const updateCell = (index, field, value) => {
    const updated = [...data];
    updated[index][field] = value;
    setData(updated);
  };

  const addRow = () => {
    setData([
      ...data,
      { city: "", value: "" }
    ]);
  };

  return (
    <div className="data-table">

      <h3>Data</h3>

      <table>
        <thead>
          <tr>
            <th>City</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={index}>

              <td>
  <input
    value={row.city}
    disabled
  />
</td>
              <td>
                <input
                  value={row.value}
                  onChange={(e) =>
                    updateCell(index, "value", e.target.value)
                  }
                />
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addRow}>
        + Add Row
      </button>

    </div>
  );
}