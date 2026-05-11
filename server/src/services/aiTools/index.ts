import type { CvData } from "@cvie/shared";
import { experienceTools } from "./experiences";
import { formationTools } from "./formations";
import { personalInfoTools } from "./personalInfo";
import { interestTools, languageTools, skillTools } from "./simpleSections";
import type { AssistantState } from "./helpers";

export type { AssistantState, Patch, ToolResult } from "./helpers";

export function buildAssistantTools(initialCv: CvData) {
  const state: AssistantState = { cv: initialCv };
  const tools = {
    ...personalInfoTools(state),
    ...experienceTools(state),
    ...formationTools(state),
    ...skillTools(state),
    ...languageTools(state),
    ...interestTools(state),
  };
  return { state, tools };
}

export type AssistantTools = ReturnType<typeof buildAssistantTools>["tools"];
