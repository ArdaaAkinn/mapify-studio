// Kept out of Map.jsx (rather than defined inline) so it can be unit
// tested, and so Map.jsx can stay a component-only export for Fast Refresh.

// Two axis-aligned label boxes overlap if they intersect on both axes.
export const overlaps = (a, b) =>
  a.x1 < b.x2 &&
  a.x2 > b.x1 &&
  a.y1 < b.y2 &&
  a.y2 > b.y1;
