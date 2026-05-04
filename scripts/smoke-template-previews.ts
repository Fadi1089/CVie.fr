import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { sampleCv } from "../shared/src/cv/defaults.ts";
import { renderCvHtml, type TemplateId } from "../shared/src/templates/renderer.ts";
import { templateIds } from "../shared/src/templates/figma/templateSync.ts";

const outputDir = resolve(
  process.env.TEMPLATE_PREVIEW_DIR || "/tmp/cvie-template-previews",
);

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const templateId of templateIds) {
      const page = await browser.newPage({
        viewport: { width: 900, height: 1300 },
        deviceScaleFactor: 1,
      });
      const html = renderCvHtml(sampleCv, templateId as TemplateId);
      await page.setContent(html, { waitUntil: "load", timeout: 10_000 });
      await page.evaluate("document.fonts && document.fonts.ready");
      const path = resolve(outputDir, `${templateId}.png`);
      await page.screenshot({ path, fullPage: true });
      await page.close();
      console.log(`wrote ${path}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
