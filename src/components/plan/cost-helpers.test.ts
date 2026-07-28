import { describe, it, expect } from "vitest";
import { formatEstimate, sumSlotEstimates } from "./cost-helpers";

// W6's guardrails are the whole point of these tests. Griffin chose to build
// LLM cost estimation over the recommendation to drop the design's numbers, so
// the only defensible version is one where the dishonest renderings are not
// expressible: no bare figures, no cents, no zero.

describe("formatEstimate", () => {
  it("should always mark the number as an estimate", () => {
    expect(formatEstimate(8700)).toBe("~$87");
  });

  it("should never render cents", () => {
    // "$86.40" claims a resolution the model does not have.
    expect(formatEstimate(8640)).toBe("~$86");
    expect(formatEstimate(8660)).toBe("~$87");
  });

  it("should round rather than truncate — a low guess reads worse at the till", () => {
    expect(formatEstimate(8699)).toBe("~$87");
  });

  it("should render nothing rather than a zero", () => {
    // Zero is a claim; absence is the truth.
    expect(formatEstimate(0)).toBeNull();
    expect(formatEstimate(null)).toBeNull();
    expect(formatEstimate(undefined)).toBeNull();
  });

  it("should render nothing for a nonsense value", () => {
    expect(formatEstimate(Number.NaN)).toBeNull();
    expect(formatEstimate(-500)).toBeNull();
  });
});

describe("sumSlotEstimates", () => {
  it("should total the slots that carry an estimate", () => {
    expect(
      sumSlotEstimates([{ estCostCents: 1200 }, { estCostCents: 2300 }])
    ).toBe(3500);
  });

  it("should return null when nothing is estimated", () => {
    expect(sumSlotEstimates([{}, { estCostCents: null }])).toBeNull();
  });

  it("should return a partial sum mid-generation", () => {
    // A draft where two of five slots are still being written is honestly
    // described by "the three I've written come to about this".
    expect(
      sumSlotEstimates([{ estCostCents: 1000 }, {}, { estCostCents: 500 }])
    ).toBe(1500);
  });

  it("should return null for an empty week", () => {
    expect(sumSlotEstimates([])).toBeNull();
  });
});
