import { describe, expect, it } from "vitest";
import {
  extractTemplateDefinitionsFromFigmaFile,
  generateStyleModule,
  validateTemplateDefinition,
} from "./templateSync";

function textNode(
  id: string,
  role: string,
  characters: string,
  fontFamily = "Inter",
) {
  return {
    id,
    name: role,
    type: "TEXT",
    characters,
    style: {
      fontFamily,
      fontPostScriptName: `${fontFamily.replace(/\s+/g, "")}-Regular`,
      fontSize: 16,
      fontWeight: 400,
      lineHeightPercent: 150,
      letterSpacing: 0,
    },
    fills: [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }],
    sharedPluginData: {
      "cvie.templates": {
        role,
        templateId: "classique",
      },
    },
  };
}

function frameNode(
  id: string,
  role: string,
  children: unknown[] = [],
  extra: Record<string, unknown> = {},
  nodeExtra: Record<string, unknown> = {},
) {
  return {
    id,
    name: role,
    type: "FRAME",
    x: 0,
    y: 0,
    width: 793.7008,
    height: 1122.5197,
    layoutMode: "VERTICAL",
    itemSpacing: 18,
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }],
    strokes: [],
    ...nodeExtra,
    children,
    sharedPluginData: {
      "cvie.templates": {
        role,
        templateId: "classique",
        ...extra,
      },
    },
  };
}

function rectangleNode(id: string, role: string, width = 80, height = 80) {
  return {
    id,
    name: role,
    type: "RECTANGLE",
    x: 0,
    y: 0,
    width,
    height,
    fills: [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }],
    strokes: [],
    sharedPluginData: {
      "cvie.templates": {
        role,
        templateId: "classique",
      },
    },
  };
}

function validFigmaFile() {
  const section = (sectionId: string) =>
    frameNode(
      `section-${sectionId}`,
      "section",
      [
        frameNode("section-title-wrap", "section.titleWrap", [
          textNode("section-title", "section.title", sectionId),
        ], {}, {
          strokes: [{ type: "SOLID", color: { r: 0.6588, g: 0.2588, b: 0.1176 } }],
        }),
      ],
      { sectionId },
    );

  return {
    name: "CV templates",
    document: {
      id: "0:0",
      name: "Document",
      type: "DOCUMENT",
      children: [
        {
          id: "0:1",
          name: "Classique",
          type: "CANVAS",
          children: [
            frameNode("template", "template", [
              frameNode("header", "header", [
                rectangleNode("photo", "header.photo"),
                textNode("name", "text.name", "Yasmine Benali", "Newsreader"),
                textNode("headline", "text.headline", "Etudiante", "Inter"),
                textNode("summary", "text.summary", "Summary", "Newsreader"),
              ]),
              section("formations"),
              section("experiences"),
              section("skills"),
              section("languages"),
              section("interests"),
            ]),
          ],
        },
      ],
    },
  };
}

function asRestGeometry(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const current = node as {
    document?: unknown;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
    children?: unknown[];
  };
  if (typeof current.width === "number" && typeof current.height === "number") {
    current.absoluteBoundingBox = {
      x: current.x ?? 0,
      y: current.y ?? 0,
      width: current.width,
      height: current.height,
    };
    delete current.width;
    delete current.height;
  }
  asRestGeometry(current.document);
  current.children?.forEach(asRestGeometry);
  return node;
}

describe("Figma template sync", () => {
  it("extracts and validates a normalized Figma template document", () => {
    const [definition] = extractTemplateDefinitionsFromFigmaFile(
      validFigmaFile(),
      "figma-file-key",
    );

    expect(definition?.id).toBe("classique");
    expect(definition?.source.rootNodeId).toBe("template");
    expect(definition?.sections.map((section) => section.id)).toEqual([
      "formations",
      "experiences",
      "skills",
      "languages",
      "interests",
    ]);
    expect(definition?.colors.accent).toBe("#a8421e");
    expect(() => validateTemplateDefinition(definition!)).not.toThrow();
  });

  it("fails when a critical role is duplicated", () => {
    const file = validFigmaFile();
    const root = file.document.children[0]!.children[0]!;
    root.children.push(textNode("duplicate-name", "text.name", "Duplicate"));

    expect(() =>
      extractTemplateDefinitionsFromFigmaFile(file, "figma-file-key"),
    ).toThrow(/expected exactly 1 role text\.name/i);
  });

  it("extracts dimensions from Figma REST absoluteBoundingBox geometry", () => {
    const file = asRestGeometry(validFigmaFile());
    const [definition] = extractTemplateDefinitionsFromFigmaFile(
      file,
      "figma-file-key",
    );

    expect(definition?.page.widthPx).toBe(793.7008);
    expect(definition?.page.heightPx).toBe(1122.5197);
    expect(definition?.layout.photoSizeMm.width).toBeCloseTo(21.1667, 4);
    expect(definition?.layout.photoSizeMm.height).toBeCloseTo(21.1667, 4);
  });

  it("extracts photo stroke weight, corner radius, and border color from Figma", () => {
    const file = validFigmaFile();
    const root = file.document.children[0]!.children[0]!;
    const header = root.children[0]!;
    const photoIndex = header.children.findIndex(
      (node) => node.sharedPluginData?.["cvie.templates"]?.role === "header.photo",
    );
    header.children[photoIndex] = {
      ...rectangleNode("photo", "header.photo", 80, 80),
      strokes: [{ type: "SOLID", color: { r: 0.106, g: 0.212, b: 0.365 } }],
      strokeWeight: 1,
      cornerRadius: 4,
    };

    const [definition] = extractTemplateDefinitionsFromFigmaFile(
      file,
      "figma-file-key",
    );

    expect(definition?.layout.photoStrokeWeightPt).toBeCloseTo(0.75, 4);
    expect(definition?.layout.photoBorderRadiusMm).toBeCloseTo(1.0583, 4);
    expect(definition?.colors.photoBorder).toBe("#1b365d");
    expect(generateStyleModule(definition!)).toContain("#1B365D");
  });

  it("uses the decorative rule as the accent when a template's accent follows rules", () => {
    const file = validFigmaFile();
    const page = file.document.children[0]!;
    page.name = "Moderne";
    const root = page.children[0]!;
    root.sharedPluginData["cvie.templates"].templateId = "moderne";
    root.children.push({
      ...rectangleNode("modern-rule", "section.rule", 120, 1),
      fills: [{ type: "SOLID", color: { r: 0.6588, g: 0.2588, b: 0.1176 } }],
    });
    const header = root.children[0]!;
    const photo = header.children[0]!;
    photo.strokes = [{ type: "SOLID", color: { r: 0.067, g: 0.067, b: 0.067 } }];

    const [definition] = extractTemplateDefinitionsFromFigmaFile(
      file,
      "figma-file-key",
    );

    expect(definition?.id).toBe("moderne");
    expect(definition?.colors.rule).toBe("#a8421e");
    expect(definition?.colors.accent).toBe("#a8421e");
  });

  it("fails when a required section is missing", () => {
    const file = validFigmaFile();
    const root = file.document.children[0]!.children[0]!;
    root.children = root.children.filter(
      (node) =>
        !(
          node.sharedPluginData?.["cvie.templates"]?.role === "section" &&
          node.sharedPluginData?.["cvie.templates"]?.sectionId === "skills"
        ),
    );

    expect(() =>
      extractTemplateDefinitionsFromFigmaFile(file, "figma-file-key"),
    ).toThrow(/missing required section skills/i);
  });

  it("fails when a template uses a font outside the allowlist", () => {
    const file = validFigmaFile();
    const root = file.document.children[0]!.children[0]!;
    const header = root.children[0]!;
    const nameIndex = header.children.findIndex(
      (node) => node.sharedPluginData?.["cvie.templates"]?.role === "text.name",
    );
    header.children[nameIndex] = textNode(
      "name",
      "text.name",
      "Yasmine Benali",
      "Comic Sans MS",
    );

    expect(() =>
      extractTemplateDefinitionsFromFigmaFile(file, "figma-file-key"),
    ).toThrow(/unsupported font/i);
  });

  it("generates deterministic style modules with the existing renderer exports", () => {
    const [definition] = extractTemplateDefinitionsFromFigmaFile(
      validFigmaFile(),
      "figma-file-key",
    );
    const moduleA = generateStyleModule(definition!);
    const moduleB = generateStyleModule(definition!);

    expect(moduleA).toBe(moduleB);
    expect(moduleA).toContain("export const classiqueCss");
    expect(moduleA).toContain(".cv section h2");
    expect(moduleA).toContain(".cv header .photo");
    expect(moduleA).toContain(".cv .portfolio-qr-box");
    expect(moduleA).toContain(".cv .skills-grouped");
    expect(moduleA).toContain(".cv .languages-list");
    expect(moduleA).toContain(".cv .interests-list");
  });
});
