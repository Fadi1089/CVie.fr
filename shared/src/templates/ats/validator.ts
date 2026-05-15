export type AtsReport = {
  score: number; // 0..100
  passed: boolean; // score >= 80
  flags: string[];
};

const REQUIRED_TAGS = ["<h1", "<h2", "<section"];
const FORBIDDEN_IN_STRICT = ["<table", "<canvas", "<svg"];

// Match grid-template-columns where the value isn't equivalent to a single column.
// Allow:  1fr, 1fr auto (single content column with auto sidebar), repeat(N, 1fr) (uniform N-column grid)
// Flag:   percentage splits (32% 68%), mixed fr units (2fr 1fr), explicit pixel widths,
//         and 1fr-prefixed multi-column patterns like "1fr 1fr" or "1fr 2fr".
// The \s*(?:!important\s*)?(?:;|\}|$) suffix anchors each allowed pattern to the end of the
// value (tolerating the CSS !important flag emitted by the ATS override layer) so that
// "1fr 1fr" does NOT match the "1fr" alternative (the extra token after 1fr isn't a terminator).
const MULTI_COLUMN_RE =
  /grid-template-columns:(?!\s*(?:1fr|1fr\s+auto|repeat\(\s*\d+\s*,\s*1fr\s*\))\s*(?:!important\s*)?(?:;|\}|$))/;

export function validateAtsHtml(html: string, strict: boolean): AtsReport {
  const flags: string[] = [];
  let score = 100;

  for (const t of REQUIRED_TAGS) {
    if (!html.includes(t)) {
      flags.push(`missing required tag: ${t}`);
      score -= 15;
    }
  }
  if (strict) {
    for (const t of FORBIDDEN_IN_STRICT) {
      if (html.includes(t)) {
        flags.push(`forbidden in ats-strict: ${t}`);
        score -= 20;
      }
    }
    if (MULTI_COLUMN_RE.test(html)) {
      flags.push("multi-column layout retained in ats-strict");
      score -= 25;
    }
  }
  if (!/<meta\s+name=["']author["']/i.test(html)) {
    flags.push("missing author meta");
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    passed: score >= 80,
    flags,
  };
}
