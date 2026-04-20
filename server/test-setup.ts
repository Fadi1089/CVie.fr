// pdfjs-dist (used by pdf-parse v2) calls `new DOMMatrix()` at module init.
// Bun has no DOM globals. This stub prevents the crash at load time.
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true;
    isIdentity = true;
    constructor(_init?: string | number[]) {}
  } as unknown as typeof DOMMatrix;
}
if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    data = new Uint8ClampedArray();
    width = 0;
    height = 0;
    constructor(_w: number, _h: number) {}
  } as unknown as typeof ImageData;
}
if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class Path2D {} as unknown as typeof Path2D;
}
