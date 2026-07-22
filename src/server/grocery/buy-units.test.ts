import { describe, it, expect } from "vitest";
import { resolveBuyUnit, finalizeBuyUnitAmount } from "./buy-units";

describe("resolveBuyUnit", () => {
  it("resolves staples to the staple policy", () => {
    expect(resolveBuyUnit("salt")).toEqual({ kind: "staple" });
    expect(resolveBuyUnit("black pepper")).toEqual({ kind: "staple" });
    expect(resolveBuyUnit("olive oil")).toEqual({ kind: "staple" });
  });

  it("resolves concrete buy-unit items to their unit", () => {
    expect(resolveBuyUnit("carrot")).toEqual({ kind: "unit", unit: "lb" });
    expect(resolveBuyUnit("onion")).toEqual({ kind: "unit", unit: "" });
  });

  it("matches case-insensitively and trims", () => {
    expect(resolveBuyUnit("  Olive Oil ")).toEqual({ kind: "staple" });
    expect(resolveBuyUnit("Carrot")).toEqual({ kind: "unit", unit: "lb" });
  });

  it("returns null for items not in the table (keep strict under-merge)", () => {
    expect(resolveBuyUnit("chicken broth")).toBeNull();
    expect(resolveBuyUnit("garlic")).toBeNull();
    expect(resolveBuyUnit("flour")).toBeNull();
  });
});

describe("finalizeBuyUnitAmount", () => {
  it("sums the preferred buy-unit and absorbs off-unit amounts (no conversion)", () => {
    expect(
      finalizeBuyUnitAmount(
        [
          { value: 1.5, unit: "lb" },
          { value: 0.5, unit: "cup" },
        ],
        "lb"
      )
    ).toEqual({ quantity: 1.5, unit: "lb" });
  });

  it("sums multiple preferred-unit lines", () => {
    expect(
      finalizeBuyUnitAmount(
        [
          { value: 1, unit: "lb" },
          { value: 0.5, unit: "lb" },
          { value: 2, unit: "cup" },
        ],
        "lb"
      )
    ).toEqual({ quantity: 1.5, unit: "lb" });
  });

  it("prefers a plain count over a volume when the buy-unit is absent (order-independent)", () => {
    // "2 carrots + 0.5 cup" with the cup listed first must still show the count, not
    // the less-useful "0.5 cup" — count is the legible shopping unit here.
    expect(
      finalizeBuyUnitAmount(
        [
          { value: 0.5, unit: "cup" },
          { value: 2, unit: "" },
        ],
        "lb"
      )
    ).toEqual({ quantity: 2, unit: null });
  });

  it("falls back to the mode unit when no line uses the preferred unit or a count", () => {
    expect(finalizeBuyUnitAmount([{ value: 0.5, unit: "cup" }], "lb")).toEqual({
      quantity: 0.5,
      unit: "cup",
    });
  });

  it("renders a count (empty) unit as a null unit", () => {
    expect(finalizeBuyUnitAmount([{ value: 2, unit: "" }], "")).toEqual({
      quantity: 2,
      unit: null,
    });
  });

  it("returns no amount when there are no quantified lines", () => {
    expect(finalizeBuyUnitAmount([], "lb")).toEqual({ quantity: null, unit: null });
  });
});
