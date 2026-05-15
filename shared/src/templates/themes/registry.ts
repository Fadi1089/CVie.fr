import type { Theme } from "./types";
import { atelierClassique } from "./atelier-classique/index";
import { atelierModerne } from "./atelier-moderne/index";
import { atelierMinimaliste } from "./atelier-minimaliste/index";

export const themeRegistry: readonly Theme[] = [
  atelierClassique,
  atelierModerne,
  atelierMinimaliste,
];
