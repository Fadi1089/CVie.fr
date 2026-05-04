import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateStyleModule,
  templateIds,
  validateTemplateDefinition,
} from "../shared/src/templates/figma/templateSync.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const figmaDir = resolve(repoRoot, "shared/src/templates/figma");
const stylesDir = resolve(repoRoot, "shared/src/templates/styles");
const checkOnly = process.argv.includes("--check");

async function readDefinition(templateId: string) {
  const path = resolve(figmaDir, `${templateId}.generated.json`);
  const raw = await readFile(path, "utf8");
  return validateTemplateDefinition(JSON.parse(raw));
}

async function main() {
  const stale: string[] = [];
  await mkdir(stylesDir, { recursive: true });

  for (const templateId of templateIds) {
    const definition = await readDefinition(templateId);
    const stylePath = resolve(stylesDir, `${templateId}.ts`);
    const next = generateStyleModule(definition);

    if (checkOnly) {
      const current = await readFile(stylePath, "utf8").catch(() => "");
      if (current !== next) stale.push(stylePath);
      continue;
    }

    await writeFile(stylePath, next, "utf8");
    console.log(`generated ${stylePath}`);
  }

  if (stale.length > 0) {
    console.error("Generated template CSS is stale:");
    for (const path of stale) console.error(`- ${path}`);
    console.error("Run `bun run generate:template-css`.");
    process.exitCode = 1;
  }
}

await main();
