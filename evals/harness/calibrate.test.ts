import { describe, expect, it } from "vitest";
import { scoreAgreement } from "./calibrate";

const item = (judge: boolean, human: boolean) => ({
  judgeVerdict: judge,
  humanVerdict: human,
});

describe("scoreAgreement", () => {
  it("reports agreement in both directions separately", () => {
    // A judge that passes everything looks great on overall agreement when most
    // outputs are good, and is useless — it never catches a bad one. Splitting
    // the rate by what the human said is what exposes that.
    const result = scoreAgreement([
      item(true, true),
      item(true, true),
      item(true, true),
      item(true, false),
      item(true, false),
    ]);
    expect(result.truePositiveRate).toBe(1);
    expect(result.trueNegativeRate).toBe(0);
    expect(result.agreed).toBe(3);
    expect(result.n).toBe(5);
  });

  it("scores a judge that tracks the human perfectly", () => {
    const result = scoreAgreement([item(true, true), item(false, false)]);
    expect(result.truePositiveRate).toBe(1);
    expect(result.trueNegativeRate).toBe(1);
    expect(result.agreed).toBe(2);
  });

  it("returns null for a direction the sample never exercised", () => {
    // Twenty labels that are all "pass" say nothing about whether the judge can
    // fail anything, and reporting 100% there would be a lie of omission.
    const result = scoreAgreement([item(true, true), item(false, true)]);
    expect(result.trueNegativeRate).toBeNull();
    expect(result.truePositiveRate).toBe(0.5);
  });
});
