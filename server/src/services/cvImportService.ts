import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { cvDataSchema, type CvData } from "@cvie/shared";

const EXTRACTION_SYSTEM_PROMPT = `Tu es un assistant expert en extraction de données de CV.
Tu reçois le texte brut extrait d'un CV PDF et tu dois en extraire les informations structurées.
Réponds UNIQUEMENT avec un objet JSON valide correspondant exactement au schéma CvData fourni.
N'ajoute aucun texte avant ou après le JSON. Pas de markdown, pas de code block.

Règles importantes:
- Les dates doivent être au format "YYYY-MM" (ex: "2020-06") ou "present" pour en cours ou "" si inconnue
- Les IDs doivent être des chaînes courtes uniques (ex: "exp1", "form1", "skill1")
- Pour les compétences, le niveau doit être l'un de: "débutant", "intermédiaire", "avancé", "expert"
- Pour les langues, le niveau doit être l'un de: "A1", "A2", "B1", "B2", "C1", "C2", "natif"
- Si une information est absente du CV, utilise "" pour les chaînes et [] pour les tableaux
- photoUrl doit être "" (on ne peut pas extraire d'image d'un PDF texte)
- linkedinUrl et portfolioUrl doivent être des URLs complètes (https://...) ou ""`;

const EXTRACTION_USER_TEMPLATE = `Voici le texte extrait d'un CV PDF. Extrais toutes les informations et retourne-les en JSON:

<cv_text>
{CV_TEXT}
</cv_text>

Schéma attendu:
{
  "personalInfo": { "firstName": string, "lastName": string, "email": string, "phone": string, "city": string, "jobTitle": string, "summary": string, "linkedinUrl": string, "portfolioUrl": string, "photoUrl": "" },
  "formations": [{ "id": string, "degree": string, "school": string, "city": string, "startDate": string, "endDate": string, "description": string }],
  "experiences": [{ "id": string, "jobTitle": string, "company": string, "city": string, "startDate": string, "endDate": string, "bullets": string[], "description": string }],
  "skills": [{ "id": string, "name": string, "level": "débutant"|"intermédiaire"|"avancé"|"expert", "category": string }],
  "languages": [{ "id": string, "name": string, "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|"natif" }],
  "interests": [{ "id": string, "name": string }]
}`;

function resolveModel() {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "openai") {
    return openai("gpt-4o-mini");
  }
  return anthropic("claude-haiku-4-5-20251001");
}

export async function extractCvFromPdf(pdfBuffer: Buffer): Promise<CvData> {
  const { default: pdfParse } = await import("pdf-parse");
  const parsed = await pdfParse(pdfBuffer);
  const cvText = parsed.text.trim();

  if (!cvText) {
    throw new Error("Aucun texte trouvé dans ce PDF (PDF scanné sans OCR ?)");
  }

  const { text } = await generateText({
    model: resolveModel(),
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: EXTRACTION_USER_TEMPLATE.replace("{CV_TEXT}", cvText.slice(0, 12_000)),
    maxTokens: 4096,
  });

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text.trim());
  } catch {
    throw new Error("L'IA n'a pas retourné un JSON valide");
  }

  const result = cvDataSchema.safeParse(rawJson);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(`Données extraites invalides: ${firstIssue?.message ?? "schéma non respecté"}`);
  }

  return result.data;
}
