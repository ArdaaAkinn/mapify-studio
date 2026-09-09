// Pure helpers shared by App.jsx, kept in their own module (rather than
// defined inline) so they can be unit tested without dragging in the whole
// component tree (D3, topojson, canvas rendering, xlsx...) that App.jsx and
// its children pull in.

// Matches imported region names (which vary in spelling/diacritics/casing
// across spreadsheets) up with the map's own feature names.
export const normalizeRegionName = (value) => {
  const aliases = {
    turkiye: "turkey",
    "bosnia and herzegovina": "bosnia and herz.",
    "bosnia & herzegovina": "bosnia and herz.",
    bosnia: "bosnia and herz.",
    bih: "bosnia and herz.",
  };

  const normalized = String(value ?? "")
    .trim()
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  return aliases[normalized] ?? normalized;
};

// Builds the initial (empty-value) data-table rows from a loaded map's
// GeoJSON — one row per feature, named from whichever property key that
// particular dataset happens to use.
export const createMapRows = (selectedMap) => {
  if (!selectedMap?.features) return [];

  return selectedMap.features.map((feature) => {
    const name =
      feature.properties.NAME_1 ||
      feature.properties.Estado ||
      feature.properties.Propinsi ||
      feature.properties.name ||
      feature.properties.Name ||
      feature.properties.nom ||
      feature.properties.reg_name ||
      feature.properties.NAME ||
      feature.properties.NUTS_NAME ||
      feature.properties.admin ||
      feature.properties.STATE_NAME ||
      feature.properties.region ||
      feature.properties.county;

    return {
      city: name,
      value: "",
    };
  });
};

export const formatRelativeTime = (timestamp) => {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};
