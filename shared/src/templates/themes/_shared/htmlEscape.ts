const HTML_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return s.replace(/[&<>"']/g, (ch) => HTML_MAP[ch]!);
}

const ATTR_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\x00-\x1F\x7F-\x9F]/g;

export function escapeAttr(s: string | undefined | null): string {
  if (s == null) return "";
  return s.replace(CONTROL_RE, "").replace(/[&<>"']/g, (ch) => ATTR_MAP[ch]!);
}
