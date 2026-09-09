// Kept out of Upload.jsx (rather than defined inline) so it can be unit
// tested, and so Upload.jsx can stay a component-only export for Fast Refresh.

const CITY_KEYWORDS  = ["city", "name", "region", "province", "state", "country", "place", "area", "district", "il", "sehir"];
const VALUE_KEYWORDS = ["value", "count", "number", "score", "population", "amount", "total", "data", "deger", "sayi"];

export function detectColumns(keys) {
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
