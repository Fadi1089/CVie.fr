import type { Theme } from "../types";
import { customizationSchema, defaultCustomization } from "./customization";

/**
 * Stack Overflow community theme — meta only. The actual render uses the
 * upstream `jsonresume-theme-stackoverflow` package which reads CSS via
 * `fs.readFileSync` at runtime and pulls in Svelte 5's SSR runtime. Both
 * are Node-only, so the render lives in
 * `server/src/services/resumeRenderServer.ts` and the client never imports it.
 *
 * The stub render here throws by design: client code calls
 * `renderResumeHtml()` from shared for live preview, and that path is being
 * replaced by a server fetch (`POST /api/v1/cv/preview-html`) for community
 * themes. Any synchronous call into this render is a bug.
 */
export const communityStackoverflow: Theme = {
  meta: {
    id: "community-stackoverflow",
    name: "Stack Overflow",
    description:
      "Theme communautaire Stack Overflow — barre latérale photo, sections colorées, mise en page éditoriale dense.",
    tier: "free",
    atsProfile: { minSupported: "ats-balanced", defaultMode: "expressive" },
    supportsPhoto: true,
    defaultPalette: {
      accent: "#ff6d1f",
      link:   "#0095ff",
      ink:    "#202931",
      soft:   "#40484f",
      rule:   "#cccccc",
      canvas: "#ffffff",
    },
    defaultCustomization,
    customizationSchema,
  },
  render: () => {
    throw new Error(
      "community-stackoverflow must be rendered server-side (see server/src/services/resumeRenderServer.ts)",
    );
  },
};
