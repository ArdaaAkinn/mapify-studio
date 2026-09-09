import { describe, it, expect } from "vitest";
import { normalizeRegionName, createMapRows, formatRelativeTime } from "./mapDataUtils";

describe("normalizeRegionName", () => {
  it("trims and lowercases", () => {
    expect(normalizeRegionName("  Turkey  ")).toBe("turkey");
    expect(normalizeRegionName("FRANCE")).toBe("france");
  });

  it("folds Turkish diacritics to their plain-latin equivalent", () => {
    expect(normalizeRegionName("İstanbul")).toBe("istanbul");
    expect(normalizeRegionName("Kırıkkale")).toBe("kirikkale");
    expect(normalizeRegionName("Muş")).toBe("mus");
    expect(normalizeRegionName("Ağrı")).toBe("agri");
    expect(normalizeRegionName("Ürgüp")).toBe("urgup");
    expect(normalizeRegionName("Ördek")).toBe("ordek");
    expect(normalizeRegionName("Çanakkale")).toBe("canakkale");
  });

  it("maps known aliases onto the map's canonical name", () => {
    expect(normalizeRegionName("Turkiye")).toBe("turkey");
    expect(normalizeRegionName("Bosnia and Herzegovina")).toBe("bosnia and herz.");
    expect(normalizeRegionName("Bosnia & Herzegovina")).toBe("bosnia and herz.");
    expect(normalizeRegionName("Bosnia")).toBe("bosnia and herz.");
    expect(normalizeRegionName("BiH")).toBe("bosnia and herz.");
  });

  it("leaves unrecognized names as their normalized form", () => {
    expect(normalizeRegionName("Some Region")).toBe("some region");
  });

  it("treats null/undefined/empty as an empty string", () => {
    expect(normalizeRegionName(null)).toBe("");
    expect(normalizeRegionName(undefined)).toBe("");
    expect(normalizeRegionName("")).toBe("");
  });
});

describe("createMapRows", () => {
  it("returns an empty array when there's no feature list", () => {
    expect(createMapRows(null)).toEqual([]);
    expect(createMapRows({})).toEqual([]);
  });

  it("reads the name from whichever property key the source data uses", () => {
    const cases = [
      ["NAME_1", "Foo"],
      ["Estado", "Bar"],
      ["Propinsi", "Baz"],
      ["name", "Qux"],
      ["Name", "Quux"],
      ["nom", "Corge"],
      ["reg_name", "Grault"],
      ["NAME", "Garply"],
      ["NUTS_NAME", "Waldo"],
      ["admin", "Fred"],
      ["STATE_NAME", "Plugh"],
      ["region", "Xyzzy"],
      ["county", "Thud"],
    ];

    for (const [key, value] of cases) {
      const rows = createMapRows({ features: [{ properties: { [key]: value } }] });
      expect(rows).toEqual([{ city: value, value: "" }]);
    }
  });

  it("prefers earlier keys in the fallback chain when several are present", () => {
    const rows = createMapRows({
      features: [{ properties: { NAME_1: "First", name: "Second" } }],
    });
    expect(rows).toEqual([{ city: "First", value: "" }]);
  });

  it("maps every feature in order", () => {
    const rows = createMapRows({
      features: [
        { properties: { name: "A" } },
        { properties: { name: "B" } },
      ],
    });
    expect(rows).toEqual([
      { city: "A", value: "" },
      { city: "B", value: "" },
    ]);
  });
});

describe("formatRelativeTime", () => {
  it("says 'just now' for anything under a minute", () => {
    expect(formatRelativeTime(Date.now())).toBe("just now");
    expect(formatRelativeTime(Date.now() - 30_000)).toBe("just now");
  });

  it("reports whole minutes, singular and plural", () => {
    expect(formatRelativeTime(Date.now() - 60_000)).toBe("1 minute ago");
    expect(formatRelativeTime(Date.now() - 5 * 60_000)).toBe("5 minutes ago");
  });

  it("reports whole hours, singular and plural", () => {
    expect(formatRelativeTime(Date.now() - 60 * 60_000)).toBe("1 hour ago");
    expect(formatRelativeTime(Date.now() - 3 * 60 * 60_000)).toBe("3 hours ago");
  });

  it("reports whole days, singular and plural", () => {
    expect(formatRelativeTime(Date.now() - 24 * 60 * 60_000)).toBe("1 day ago");
    expect(formatRelativeTime(Date.now() - 4 * 24 * 60 * 60_000)).toBe("4 days ago");
  });
});
