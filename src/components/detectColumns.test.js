import { describe, it, expect } from "vitest";
import { detectColumns } from "./detectColumns";

describe("detectColumns", () => {
  it("finds an exact keyword match for both columns", () => {
    expect(detectColumns(["City", "Population"])).toEqual({
      cityKey: "City",
      valueKey: "Population",
    });
  });

  it("matches keywords as a substring when there's no exact match", () => {
    expect(detectColumns(["Region name", "Sales total"])).toEqual({
      cityKey: "Region name",
      valueKey: "Sales total",
    });
  });

  it("prefers an exact match over a partial one", () => {
    // "state" is an exact CITY_KEYWORDS match; "state population" only
    // partially matches — the exact one should win the cityKey slot.
    expect(detectColumns(["state population", "state"]).cityKey).toBe("state");
  });

  it("falls back to first/second column when neither header matches a keyword", () => {
    expect(detectColumns(["Foo", "Bar"])).toEqual({ cityKey: "Foo", valueKey: "Bar" });
  });

  it("uses the only other column as the value key when just the city column matched", () => {
    // "city" matches CITY_KEYWORDS; "widgets" matches nothing.
    expect(detectColumns(["city", "widgets"])).toEqual({ cityKey: "city", valueKey: "widgets" });
  });

  it("uses the only other column as the city key when just the value column matched", () => {
    // "population" matches VALUE_KEYWORDS; "label" matches nothing.
    expect(detectColumns(["label", "population"])).toEqual({ cityKey: "label", valueKey: "population" });
  });

  it("handles a single-column sheet by treating it as the city column", () => {
    expect(detectColumns(["Foo"])).toEqual({ cityKey: "Foo", valueKey: null });
  });

  it("is case- and punctuation-insensitive when matching keywords", () => {
    expect(detectColumns(["  CITY! ", "Value #"])).toEqual({
      cityKey: "  CITY! ",
      valueKey: "Value #",
    });
  });
});
