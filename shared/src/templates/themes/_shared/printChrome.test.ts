import { describe, it, expect } from "vitest";
import { BASE_PRINT_CSS, FONT_READY_MARKER, A4_VIEWPORT_PX } from "./printChrome";

describe("BASE_PRINT_CSS", () => {
  it("declares A4 page size and zero default margins", () => {
    expect(BASE_PRINT_CSS).toMatch(/@page\s*\{[^}]*size:\s*A4/);
    expect(BASE_PRINT_CSS).toMatch(/@page\s*\{[^}]*margin:\s*0/);
  });
  it("removes default body margin so the page edge is honest", () => {
    expect(BASE_PRINT_CSS).toMatch(/body\s*\{[^}]*margin:\s*0/);
  });
});

describe("A4_VIEWPORT_PX", () => {
  it("is 794 (A4 width @ 96 dpi)", () => {
    expect(A4_VIEWPORT_PX.width).toBe(794);
    expect(A4_VIEWPORT_PX.height).toBe(1123);
  });
});

describe("FONT_READY_MARKER", () => {
  it("is a stable identifier used by the renderer to await fonts", () => {
    expect(FONT_READY_MARKER).toBe("data-fonts-ready");
  });
});
