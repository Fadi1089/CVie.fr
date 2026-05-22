export const AI_FEATURES = ["cvImport", "cvTranslate", "cvAssistant", "cvTailor"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  cvImport: "Import CV (PDF)",
  cvTranslate: "Traduction CV",
  cvAssistant: "Assistant éditeur",
  cvTailor: "Adaptation CV (offre)",
};

export const AI_FEATURE_DESCRIPTIONS: Record<AiFeature, string> = {
  cvImport:
    "Extraction structurée à partir d'un PDF. Demande au modèle de produire un JSON conforme au schéma CV.",
  cvTranslate:
    "Réécriture d'un CV existant dans une autre langue. Conserve les noms propres, dates et niveaux.",
  cvAssistant:
    "Assistant conversationnel intégré à l'éditeur. Propose des modifications de votre CV (rédaction, ajout d'expériences, etc.) que vous validez manuellement.",
  cvTailor:
    "Adaptation d'un Master CV à une offre d'emploi. Sélectionne et reformule les expériences pertinentes en streaming.",
};

export function isAiFeature(v: unknown): v is AiFeature {
  return typeof v === "string" && (AI_FEATURES as readonly string[]).includes(v);
}
