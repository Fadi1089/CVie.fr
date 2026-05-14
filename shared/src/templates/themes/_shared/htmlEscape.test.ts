import { describe, it, expect } from "vitest";
import { escapeHtml, escapeAttr } from "./htmlEscape";

describe("escapeHtml", () => {
  it("escapes <, >, &, \"", () => {
    expect(escapeHtml("<script>&\"")).toBe("&lt;script&gt;&amp;&quot;");
  });
  it("escapes single quotes for safety", () => {
    expect(escapeHtml("o'reilly")).toBe("o&#39;reilly");
  });
  it("returns the empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("escapeAttr", () => {
  it("escapes the four attribute-dangerous characters", () => {
    expect(escapeAttr("\"<>&")).toBe("&quot;&lt;&gt;&amp;");
  });
  it("escapes ASCII control characters by stripping them", () => {
    expect(escapeAttr("a\x00b")).toBe("ab");
  });
});
