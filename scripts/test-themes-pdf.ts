// Smoke-tests every legal theme × atsMode combination through the real PDF pipeline.
import { generateResumePdf, shutdownPdfService } from "../server/src/services/pdfService";
import { themeRegistry, sampleCvFixture, type AtsMode } from "@cvie/shared";
import { PDFParse } from "pdf-parse";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const MODES: AtsMode[] = ["ats-strict", "ats-balanced", "expressive"];
const SNAP_DIR = resolve(process.cwd(), "tests/__snapshots__/themes");
const REQUIRED_TEXT = [
  "Yasmine Benali",
  "Ingénieure logicielle senior",
  "Télécom Paris",
  "Atelier SAS",
];

const ORDER = { "ats-strict": 0, "ats-balanced": 1, expressive: 2 } as const;

async function extractText(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  const result = await parser.getText();
  return result.text;
}

async function main(): Promise<string[]> {
  await mkdir(SNAP_DIR, { recursive: true });

  const failures: string[] = [];

  for (const theme of themeRegistry) {
    for (const mode of MODES) {
      const minRank = ORDER[theme.meta.atsProfile.minSupported];
      const modeRank = ORDER[mode];

      // Skip unsupported combinations (mode is stricter than minSupported)
      if (modeRank < minRank) {
        console.log(`  skip  ${theme.meta.id} × ${mode} (below minSupported=${theme.meta.atsProfile.minSupported})`);
        continue;
      }

      const label = `${theme.meta.id} × ${mode}`;
      try {
        const bytes = await generateResumePdf({
          cv: sampleCvFixture,
          themeId: theme.meta.id,
          atsMode: mode,
          customization: {},
        });

        const snapPath = resolve(SNAP_DIR, `${theme.meta.id}-${mode}.pdf`);
        await writeFile(snapPath, bytes);
        console.log(`  wrote ${snapPath}`);

        const text = await extractText(bytes);

        // Check required phrases
        for (const phrase of REQUIRED_TEXT) {
          if (!text.includes(phrase)) {
            failures.push(`[${label}] Missing required text: "${phrase}"`);
          }
        }

        // For ats-strict, ornament must not appear
        if (mode === "ats-strict" && text.includes("◆")) {
          failures.push(`[${label}] Ornament "◆" found in ats-strict output`);
        }

        if (failures.length === 0 || !failures.some((f) => f.startsWith(`[${label}]`))) {
          console.log(`  pass  ${label}`);
        }
      } catch (err) {
        failures.push(`[${label}] Threw: ${(err as Error).message}`);
      }
    }
  }

  return failures;
}

try {
  const failures = await main();
  if (failures.length > 0) {
    for (const f of failures) {
      process.stderr.write(`FAIL: ${f}\n`);
    }
    process.exitCode = 1;
  } else {
    console.log("All theme×mode combinations produced valid ATS-compliant PDFs.");
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await shutdownPdfService();
}
