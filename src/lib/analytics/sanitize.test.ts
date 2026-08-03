import { describe, it, expect } from "vitest";
import { sanitizeAnalyticsUrl } from "./sanitize";

describe("sanitizeAnalyticsUrl", () => {
  // ⚠️ The reason this module exists. Gate 1's secret travels in this query
  // param, and PostHog captures $current_url on every single event.
  it("strips the access code from an invite URL", () => {
    expect(
      sanitizeAnalyticsUrl("https://app.example.com/invite?code=s3cr3t-code")
    ).toBe("https://app.example.com/invite");
  });

  it("keeps origin and path", () => {
    expect(sanitizeAnalyticsUrl("https://app.example.com/plan")).toBe(
      "https://app.example.com/plan"
    );
  });

  it("keeps a recipe uuid — an opaque id is not content", () => {
    const url =
      "https://app.example.com/recipes/6f1b2c34-5d6e-4f70-8901-23456789abcd";
    expect(sanitizeAnalyticsUrl(url)).toBe(url);
  });

  it("strips fragments as well as query strings", () => {
    expect(sanitizeAnalyticsUrl("https://app.example.com/you?tab=2#memories")).toBe(
      "https://app.example.com/you"
    );
  });

  it("handles a bare path with a query string", () => {
    expect(sanitizeAnalyticsUrl("/invite?code=s3cr3t")).toBe("/invite");
    expect(sanitizeAnalyticsUrl("/groceries#top")).toBe("/groceries");
  });

  it("passes through empty and plain values unchanged", () => {
    expect(sanitizeAnalyticsUrl("")).toBe("");
    expect(sanitizeAnalyticsUrl("/plan")).toBe("/plan");
  });

  it("never returns anything containing a query separator", () => {
    const hostile = [
      "https://app.example.com/invite?code=a&next=/plan?x=1",
      "/x?y=1#z?w=2",
      "not a url at all ?code=leak",
    ];
    for (const input of hostile) {
      expect(sanitizeAnalyticsUrl(input)).not.toContain("?");
      expect(sanitizeAnalyticsUrl(input)).not.toContain("#");
    }
  });
});
