import {
  renderResumeHtml,
  themeRegistry,
  sampleCvFixture,
  validateAtsHtml,
  type AtsMode,
} from "@cvie/shared";

const MODES: AtsMode[] = ["ats-strict", "ats-balanced", "expressive"];
const ORDER = { "ats-strict": 0, "ats-balanced": 1, expressive: 2 } as const;

let failed = false;
for (const theme of themeRegistry) {
  // community-stackoverflow renders via Svelte SSR + Node APIs; shared's
  // renderResumeHtml throws for it on purpose. The PDF smoke test
  // (test-themes-pdf.ts) exercises that theme via the server pipeline.
  if (theme.meta.id === "community-stackoverflow") continue;
  for (const mode of MODES) {
    if (ORDER[mode] < ORDER[theme.meta.atsProfile.minSupported]) continue;

    const html = renderResumeHtml(sampleCvFixture, {
      themeId: theme.meta.id,
      atsMode: mode,
      customization: {},
    });
    const report = validateAtsHtml(html, mode === "ats-strict");
    const tag = `${theme.meta.id}-${mode}`;
    if (!report.passed) {
      console.error(`✗ ${tag} (score ${report.score}): ${report.flags.join("; ")}`);
      failed = true;
    } else {
      console.log(`✓ ${tag} (score ${report.score})`);
    }
  }
}
if (failed) process.exit(1);
