import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_FIGMA_TEMPLATE_FILE_KEY,
  extractTemplateDefinitionsFromFigmaFile,
  generatePaletteModule,
  generateStyleModule,
  templateIds,
} from "../shared/src/templates/figma/templateSync.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const figmaDir = resolve(repoRoot, "shared/src/templates/figma");
const stylesDir = resolve(repoRoot, "shared/src/templates/styles");

async function fetchFigmaFile(fileKey: string, token: string) {
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(
    fileKey,
  )}?plugin_data=shared`;
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Figma API request failed (${response.status} ${response.statusText}): ${body.slice(0, 500)}`,
    );
  }

  return response.json();
}

async function main() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "FIGMA_ACCESS_TOKEN is required. Create a Figma token with file_content:read scope.",
    );
  }

  const fileKey = process.env.FIGMA_FILE_KEY || DEFAULT_FIGMA_TEMPLATE_FILE_KEY;
  const file = await fetchFigmaFile(fileKey, token);
  const definitions = extractTemplateDefinitionsFromFigmaFile(file, fileKey);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));

  await mkdir(figmaDir, { recursive: true });
  await mkdir(stylesDir, { recursive: true });

  const synced: string[] = [];
  const unchanged: string[] = [];
  for (const templateId of templateIds) {
    const definition = byId.get(templateId);
    if (!definition) {
      throw new Error(`Figma file did not produce template ${templateId}`);
    }
    const jsonPath = resolve(figmaDir, `${templateId}.generated.json`);
    const cssPath = resolve(stylesDir, `${templateId}.ts`);
    const nextJson = `${JSON.stringify(definition, null, 2)}\n`;
    const nextCss = generateStyleModule(definition);
    const [prevJson, prevCss] = await Promise.all([
      readFile(jsonPath, "utf8").catch(() => null),
      readFile(cssPath, "utf8").catch(() => null),
    ]);
    if (prevJson === nextJson && prevCss === nextCss) {
      unchanged.push(templateId);
      console.log(`unchanged ${templateId}`);
      continue;
    }
    const changed: string[] = [];
    if (prevJson !== nextJson) changed.push("json");
    if (prevCss !== nextCss) changed.push("css");
    await Promise.all([
      prevJson === nextJson
        ? Promise.resolve()
        : writeFile(jsonPath, nextJson, "utf8"),
      prevCss === nextCss
        ? Promise.resolve()
        : writeFile(cssPath, nextCss, "utf8"),
    ]);
    synced.push(templateId);
    console.log(`synced ${templateId} (${changed.join(", ")})`);
  }

  // Aggregate palette module — one file across all templates so the registry
  // can import a single map. Always written when any template's colors changed
  // (or when the file is missing); skipped only if byte-identical.
  const palettePath = resolve(stylesDir, "_palettes.generated.ts");
  const nextPalette = generatePaletteModule(definitions);
  const prevPalette = await readFile(palettePath, "utf8").catch(() => null);
  if (prevPalette !== nextPalette) {
    await writeFile(palettePath, nextPalette, "utf8");
    console.log(`synced palettes (_palettes.generated.ts)`);
  } else {
    console.log(`unchanged palettes`);
  }

  console.log(
    `\n${synced.length} synced${synced.length ? `: ${synced.join(", ")}` : ""}` +
      ` · ${unchanged.length} unchanged${unchanged.length ? `: ${unchanged.join(", ")}` : ""}`,
  );
}

await main();
