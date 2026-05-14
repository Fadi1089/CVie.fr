import type { Theme } from "./types";
import { atelierClassique } from "./atelier-classique/index";
import { atelierModerne } from "./atelier-moderne/index";

export const themeRegistry: readonly Theme[] = [atelierClassique, atelierModerne];
