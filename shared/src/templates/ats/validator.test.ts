import { describe, it, expect } from "vitest";
import { validateAtsHtml } from "./validator";

describe("validateAtsHtml", () => {
  it("scores a complete semantic doc above 80", () => {
    const html = `<html><head><meta name="author" content="X"/></head><body><h1>X</h1><section><h2>Exp</h2></section></body></html>`;
    expect(validateAtsHtml(html, false).passed).toBe(true);
  });

  it("flags missing semantic headings", () => {
    const html = `<html><body><div>noisy</div></body></html>`;
    const r = validateAtsHtml(html, false);
    expect(r.passed).toBe(false);
    expect(r.flags.join(",")).toMatch(/h1|h2/);
  });

  it("flags multi-column layouts in strict mode", () => {
    const html = `<html><head><meta name="author" content="X"/><style>.cv { grid-template-columns: 32% 68%; }</style></head><body><h1>X</h1><h2>Y</h2><section></section></body></html>`;
    expect(validateAtsHtml(html, true).passed).toBe(false);
  });

  it("does NOT flag repeat(N, 1fr) grids in strict mode", () => {
    const html = `<html><head><meta name="author" content="X"/><style>.cv-skills-grid { grid-template-columns: repeat(2, 1fr); }</style></head><body><h1>X</h1><h2>Y</h2><section></section></body></html>`;
    const r = validateAtsHtml(html, true);
    expect(r.flags).not.toContain("multi-column layout retained in ats-strict");
  });

  it("does NOT flag 1fr auto (header layout) in strict mode", () => {
    const html = `<html><head><meta name="author" content="X"/><style>.cv-header { grid-template-columns: 1fr auto; }</style></head><body><h1>X</h1><h2>Y</h2><section></section></body></html>`;
    const r = validateAtsHtml(html, true);
    expect(r.flags).not.toContain("multi-column layout retained in ats-strict");
  });

  it("flags 1fr 1fr (two equal columns) in strict mode", () => {
    const html =
      `<html><head><meta name="author" content="X"/>` +
      `<style>.cv { grid-template-columns: 1fr 1fr; }</style></head>` +
      `<body><h1>X</h1><h2>Y</h2><section></section></body></html>`;
    const r = validateAtsHtml(html, true);
    expect(r.flags).toContain("multi-column layout retained in ats-strict");
  });

  it("recognizes author meta with single quotes", () => {
    const html =
      `<html><head><meta name='author' content='X'/></head>` +
      `<body><h1>X</h1><section><h2>Exp</h2></section></body></html>`;
    expect(validateAtsHtml(html, false).flags).not.toContain("missing author meta");
  });
});
