/**
 * `crypto.randomUUID()` throws in insecure contexts (http://) and on
 * pre-2021 Safari / older WebViews. Fall back to a base36-encoded
 * timestamp + random pair — not cryptographically strong, but collision-
 * safe for the volume of ids a single CV draft produces.
 */
export function newId(): string {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      let hex = "";
      for (let i = 0; i < bytes.length; i += 1) {
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return `${Date.now().toString(36)}-${hex}`;
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
