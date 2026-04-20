/**
 * `crypto.randomUUID()` throws in insecure contexts (http://) and on
 * pre-2021 Safari / older WebViews. Fall back to a base36-encoded
 * timestamp + random pair — not cryptographically strong, but collision-
 * safe for the volume of ids a single CV draft produces.
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
