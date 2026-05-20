import type { Theme } from "./types";
import { communityStackoverflow } from "./community-stackoverflow/index";
import { atelierClassique } from "./atelier-classique/index";
import { atelierModerne } from "./atelier-moderne/index";
import { atelierMinimaliste } from "./atelier-minimaliste/index";

// community-stackoverflow is the default user-facing theme; the atelier-* set
// stays registered so the legacy in-house theme tests and any persisted CVs
// referencing them keep working until we ship the explicit deprecation pass.
export const themeRegistry: readonly Theme[] = [
  communityStackoverflow,
  atelierClassique,
  atelierModerne,
  atelierMinimaliste,
];
