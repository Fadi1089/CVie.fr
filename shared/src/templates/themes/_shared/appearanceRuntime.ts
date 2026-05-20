/**
 * In-iframe runtime that applies live appearance changes (palette + per-role
 * typography / media / spacing / scale deltas) to `:root` without forcing a
 * full srcDoc reload. The server bakes the initial state via
 * `injectAppearanceVars`; this script keeps the iframe in sync with subsequent
 * Design-panel edits that arrive over postMessage.
 *
 * Why a runtime at all: every theme consumes `var(--cv-accent)` and
 * `calc(... + var(--cv-text-body-delta, 0pt))`. Mutating those custom
 * properties on `document.documentElement` re-applies the cascade instantly,
 * which feels live; doing it through a full reload flickers, drops focus, and
 * makes the slider feel laggy. Cascade ordering still favours these inline
 * styles over `<style data-theme>` and `<style data-appearance>` defaults.
 *
 * Message contract (all messages are best-effort; unknown / malformed inputs
 * are ignored):
 *   { type: "cv-palette",            palette: { accent?, link?, ink?, soft?, rule?, canvas? } | null }
 *   { type: "cv-text-deltas",        deltas:  { name?, label?, section?, title?, card?, body?, meta?, fine? } | {} }
 *   { type: "cv-media-delta",        value:   number | null | undefined }
 *   { type: "cv-qr-delta",           value:   number | null | undefined }
 *   { type: "cv-space-deltas",       deltas:  { pageMargin?, sectionGap?, itemGap? } | {} }
 *   { type: "cv-line-height-deltas", deltas:  { tight?, snug?, base? } | {} }
 *   { type: "cv-typography",         fontFamily?: "helvetica-neue"|"inter"|"georgia"|"ibm-plex-sans", letterSpacing?: number }
 *   { type: "cv-scale",              scale:   number }
 *
 * `cv-typography` clears whichever of `--cv-font-family` / `--cv-letter-spacing`
 * is absent from the payload — senders that want to update only one of the
 * two must still include the current value of the other.
 *
 * Numbers outside the documented ranges are clamped. `null` / `undefined`
 * values remove the custom property so the cascade falls back to the
 * `<style data-appearance>` block (or theme defaults if that's absent too).
 *
 * After every successful change the script posts a fresh `cv-height` message
 * so the parent iframe can resize. This keeps the parity with the legacy
 * pagination script the editor still expects.
 */
export const APPEARANCE_RUNTIME_SCRIPT = `<script data-appearance-runtime>(function(){
"use strict";
if (window.parent === window) return;
var HEX = /^#[0-9a-fA-F]{6}$/;
var TEXT_LIMITS = {
  name:    { lo: -5, hi: 8, unit: "pt" },
  label:   { lo: -4, hi: 6, unit: "pt" },
  section: { lo: -3, hi: 5, unit: "pt" },
  title:   { lo: -3, hi: 5, unit: "pt" },
  card:    { lo: -3, hi: 5, unit: "pt" },
  body:    { lo: -2, hi: 4, unit: "pt" },
  meta:    { lo: -2, hi: 4, unit: "pt" },
  fine:    { lo: -2, hi: 4, unit: "pt" }
};
var TEXT_KEYS = ["name","label","section","title","card","body","meta","fine"];
var LH_KEYS = ["tight","snug","base"];
var LH_LIMITS = { lo: -0.2, hi: 0.4 };
var SPACE_LIMITS = {
  pageMargin: { prop: "--cv-space-page-delta",    lo: -6, hi: 8, unit: "mm" },
  sectionGap: { prop: "--cv-space-section-delta", lo: -3, hi: 8, unit: "mm" },
  itemGap:    { prop: "--cv-space-item-delta",    lo: -2, hi: 6, unit: "mm" }
};
var SPACE_KEYS = ["pageMargin","sectionGap","itemGap"];
var PALETTE_PROPS = {
  accent: "--cv-accent",
  link:   "--cv-link",
  ink:    "--cv-ink",
  soft:   "--cv-soft",
  rule:   "--cv-rule",
  canvas: "--cv-canvas"
};
var PALETTE_KEYS = ["accent","link","ink","soft","rule","canvas"];
var FONT_STACKS = {
  "helvetica-neue": '"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
  "inter":          'Inter, "Helvetica Neue", Arial, sans-serif',
  "georgia":        'Georgia, "Times New Roman", Times, serif',
  "ibm-plex-sans":  '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif'
};
var LETTER_SPACING_LIMITS = { lo: -0.02, hi: 0.04 };
function clamp(n, lo, hi){ if (n < lo) return lo; if (n > hi) return hi; return n; }
function setVar(prop, value){
  var root = document.documentElement;
  if (value === null || value === undefined){
    root.style.removeProperty(prop);
  } else {
    if (root.style.getPropertyValue(prop) === value) return false;
    root.style.setProperty(prop, value);
  }
  return true;
}
function postHeight(){
  try {
    var h = document.documentElement.scrollHeight;
    parent.postMessage({ type: "cv-height", height: h }, "*");
  } catch (_) {}
}
function scheduleResync(){
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(postHeight);
  } else {
    setTimeout(postHeight, 0);
  }
}
function applyPalette(palette){
  for (var i = 0; i < PALETTE_KEYS.length; i++){
    var key = PALETTE_KEYS[i];
    var prop = PALETTE_PROPS[key];
    if (!prop) continue;
    if (!palette || palette[key] === undefined || palette[key] === null){
      setVar(prop, null);
      continue;
    }
    var v = palette[key];
    if (typeof v !== "string" || !HEX.test(v)) continue;
    setVar(prop, v);
  }
}
function applyTextDeltas(deltas){
  var d = deltas || {};
  for (var i = 0; i < TEXT_KEYS.length; i++){
    var role = TEXT_KEYS[i];
    var limits = TEXT_LIMITS[role];
    var prop = "--cv-text-" + role + "-delta";
    var raw = d[role];
    if (typeof raw !== "number" || !isFinite(raw)){
      setVar(prop, null);
      continue;
    }
    setVar(prop, clamp(raw, limits.lo, limits.hi) + limits.unit);
  }
}
function applyMediaDelta(value){
  var prop = "--cv-media-delta";
  if (typeof value !== "number" || !isFinite(value)){
    setVar(prop, null);
    return;
  }
  setVar(prop, clamp(value, -8, 12) + "mm");
}
function applyQrDelta(value){
  var prop = "--cv-qr-delta";
  if (typeof value !== "number" || !isFinite(value)){
    setVar(prop, null);
    return;
  }
  setVar(prop, clamp(value, -8, 12) + "mm");
}
function applySpaceDeltas(deltas){
  var d = deltas || {};
  for (var i = 0; i < SPACE_KEYS.length; i++){
    var key = SPACE_KEYS[i];
    var spec = SPACE_LIMITS[key];
    var raw = d[key];
    if (typeof raw !== "number" || !isFinite(raw)){
      setVar(spec.prop, null);
      continue;
    }
    setVar(spec.prop, clamp(raw, spec.lo, spec.hi) + spec.unit);
  }
}
function applyLineHeightDeltas(deltas){
  var d = deltas || {};
  for (var i = 0; i < LH_KEYS.length; i++){
    var role = LH_KEYS[i];
    var prop = "--cv-lh-" + role + "-delta";
    var raw = d[role];
    if (typeof raw !== "number" || !isFinite(raw)){
      setVar(prop, null);
      continue;
    }
    setVar(prop, String(clamp(raw, LH_LIMITS.lo, LH_LIMITS.hi)));
  }
}
function applyTypography(payload){
  var p = payload || {};
  var ff = p.fontFamily;
  if (ff && Object.prototype.hasOwnProperty.call(FONT_STACKS, ff)){
    setVar("--cv-font-family", FONT_STACKS[ff]);
  } else {
    setVar("--cv-font-family", null);
  }
  var ls = p.letterSpacing;
  if (typeof ls === "number" && isFinite(ls)){
    setVar("--cv-letter-spacing", clamp(ls, LETTER_SPACING_LIMITS.lo, LETTER_SPACING_LIMITS.hi) + "em");
  } else {
    setVar("--cv-letter-spacing", null);
  }
}
function applyScale(value){
  var prop = "--cv-scale";
  if (typeof value !== "number" || !isFinite(value) || value <= 0){
    setVar(prop, null);
    return;
  }
  setVar(prop, String(clamp(value, 0.5, 2)));
}
window.addEventListener("message", function(e){
  var data = e && e.data;
  if (!data || typeof data.type !== "string") return;
  switch (data.type){
    case "cv-palette":             applyPalette(data.palette); break;
    case "cv-text-deltas":         applyTextDeltas(data.deltas); break;
    case "cv-media-delta":         applyMediaDelta(typeof data.value === "number" ? data.value : NaN); break;
    case "cv-qr-delta":            applyQrDelta(typeof data.value === "number" ? data.value : NaN); break;
    case "cv-space-deltas":        applySpaceDeltas(data.deltas); break;
    case "cv-line-height-deltas":  applyLineHeightDeltas(data.deltas); break;
    case "cv-typography":          applyTypography(data); break;
    case "cv-scale":               applyScale(Number(data.scale)); break;
    default: return;
  }
  scheduleResync();
});
})();</script>`;

/**
 * Insert the appearance runtime right before `</body>`. Defensive: if the
 * markup has no body tag, append at the end so it still loads.
 */
export function injectAppearanceRuntime(html: string): string {
  const idx = html.lastIndexOf("</body>");
  if (idx === -1) return html + APPEARANCE_RUNTIME_SCRIPT;
  return html.slice(0, idx) + APPEARANCE_RUNTIME_SCRIPT + html.slice(idx);
}
