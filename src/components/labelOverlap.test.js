import { describe, it, expect } from "vitest";
import { overlaps } from "./labelOverlap";

const box = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });

describe("overlaps", () => {
  it("detects two boxes that clearly intersect", () => {
    expect(overlaps(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBe(true);
  });

  it("detects two boxes that are far apart", () => {
    expect(overlaps(box(0, 0, 10, 10), box(100, 100, 110, 110))).toBe(false);
  });

  it("treats boxes that only touch at an edge as not overlapping", () => {
    // strictly-less/greater comparisons, so sharing an edge doesn't count
    expect(overlaps(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(false);
  });

  it("is symmetric", () => {
    const a = box(0, 0, 10, 10);
    const b = box(5, 5, 15, 15);
    expect(overlaps(a, b)).toBe(overlaps(b, a));
  });

  it("detects one box fully containing another as overlapping", () => {
    expect(overlaps(box(0, 0, 100, 100), box(10, 10, 20, 20))).toBe(true);
  });

  it("returns false when boxes are separated on only one axis", () => {
    // same y-range, disjoint x-range
    expect(overlaps(box(0, 0, 10, 10), box(20, 0, 30, 10))).toBe(false);
    // same x-range, disjoint y-range
    expect(overlaps(box(0, 0, 10, 10), box(0, 20, 10, 30))).toBe(false);
  });
});
