export default function DataTable({ data, setData }) {

  const updateCell = (index, field, value) => {
    setData(data.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row
    ));
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
