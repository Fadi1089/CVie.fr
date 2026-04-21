# CV PDF Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload an existing CV as PDF, extract text server-side, parse it with AI, and auto-fill all CV form fields.

**Architecture:** Client sends PDF as `multipart/form-data` to `POST /api/v1/cv/import`. Server extracts text via `pdf-parse`, sends it to AI via **Vercel AI SDK** (`generateText`), returns `CvData` JSON. Client calls `form.reset()` to populate all fields, which triggers localStorage persistence automatically. Provider is swappable at runtime via `AI_PROVIDER` env var — set `anthropic` or `openai`, add the matching key.

**Tech Stack:** Hono (multipart), `pdf-parse` (already installed), `ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai` (Vercel AI SDK), React Hook Form `reset()`, `sonner` toasts for feedback.

---

## File Structure

**New files:**
- `server/src/routes/cvImport.ts` — Hono route, multipart parsing, 5 MB limit, rate limiting
- `server/src/services/cvImportService.ts` — PDF text extraction + AI call via Vercel AI SDK + CvData mapping
- `client/src/features/editor/components/CvImportButton.tsx` — file input UI, upload trigger, loading/error state
- `client/src/features/editor/hooks/useCvImport.ts` — fetch wrapper, calls `form.reset()` on success

**Modified files:**
- `server/package.json` — move `pdf-parse` from devDeps to deps, add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`
- `server/src/index.ts` — register `cvImport` route at `/api/v1/cv/import`
- `client/src/features/editor/components/CvEditor.tsx` — add `<CvImportButton>` in editor toolbar
- `.env.example` — document `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

---

## Task 1: Install dependencies

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Add Vercel AI SDK and provider packages, move pdf-parse to prod deps**

```bash
cd cvie-fr/server
bun add ai @ai-sdk/anthropic @ai-sdk/openai pdf-parse
```

Verify `server/package.json` `dependencies` contains all four new packages (and `pdf-parse` is no longer only in devDependencies).

- [ ] **Step 2: Document env vars in .env.example**

In `.env.example`, append after existing entries:

```
# AI provider for CV PDF import. Supported: "anthropic" (default) or "openai"
AI_PROVIDER=anthropic

# Required when AI_PROVIDER=anthropic — https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Required when AI_PROVIDER=openai — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Rate limit for the CV import endpoint (requests per minute, default: 5)
CV_IMPORT_RATE_LIMIT_PER_MIN=5
```

- [ ] **Step 3: Commit**

```bash
git add server/package.json bun.lock .env.example
git commit -m "chore: add Vercel AI SDK providers and move pdf-parse to server prod deps"
```

---

## Task 2: Server — CV import service

**Files:**
- Create: `server/src/services/cvImportService.ts`
- Create: `server/src/services/__tests__/cvImportService.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/services/__tests__/cvImportService.test.ts`:

```typescript
import { describe, expect, it, mock, beforeEach } from "bun:test";

const MOCK_CV_DATA = {
  personalInfo: {
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "0612345678",
    city: "Paris",
    jobTitle: "Développeur",
    summary: "Résumé test",
    linkedinUrl: "",
    portfolioUrl: "",
    photoUrl: "",
  },
  formations: [
    {
      id: "f1",
      degree: "Master Informatique",
      school: "Université Paris",
      city: "Paris",
      startDate: "2018-09",
      endDate: "2020-06",
      description: "",
    },
  ],
  experiences: [
    {
      id: "e1",
      jobTitle: "Développeur Web",
      company: "Acme Corp",
      city: "Paris",
      startDate: "2020-07",
      endDate: "present",
      bullets: ["Développement React", "API REST"],
      description: "",
    },
  ],
  skills: [{ id: "s1", name: "TypeScript", level: "avancé", category: "Développement" }],
  languages: [{ id: "l1", name: "Français", level: "natif" }],
  interests: [{ id: "i1", name: "Escalade" }],
};

// Mock Vercel AI SDK generateText
const mockGenerateText = mock(async () => ({
  text: JSON.stringify(MOCK_CV_DATA),
}));

mock.module("ai", () => ({
  generateText: mockGenerateText,
}));

// Mock provider packages — they only need to export a callable that returns a model identifier
mock.module("@ai-sdk/anthropic", () => ({
  anthropic: (modelId: string) => ({ provider: "anthropic", modelId }),
}));

mock.module("@ai-sdk/openai", () => ({
  openai: (modelId: string) => ({ provider: "openai", modelId }),
}));

// Mock pdf-parse
mock.module("pdf-parse", () => ({
  default: async (_buf: Buffer) => ({
    text: "Jean Dupont\nDéveloppeur\nParis\njean@example.com\n0612345678",
  }),
}));

import { extractCvFromPdf } from "../cvImportService";

describe("extractCvFromPdf", () => {
  beforeEach(() => {
    mockGenerateText.mockClear();
  });

  it("returns parsed CvData when AI returns valid JSON", async () => {
    const result = await extractCvFromPdf(Buffer.from("fake-pdf-bytes"));

    expect(result.personalInfo.firstName).toBe("Jean");
    expect(result.personalInfo.lastName).toBe("Dupont");
    expect(result.experiences).toHaveLength(1);
    expect(result.formations).toHaveLength(1);
    expect(result.skills[0]?.name).toBe("TypeScript");
    expect(result.languages[0]?.level).toBe("natif");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("throws when AI returns invalid JSON", async () => {
    mockGenerateText.mockImplementationOnce(async () => ({ text: "not json at all" }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow(
      "L'IA n'a pas retourné un JSON valide",
    );
  });

  it("throws when AI returns JSON that fails CvData schema", async () => {
    mockGenerateText.mockImplementationOnce(async () => ({
      text: JSON.stringify({ personalInfo: { firstName: "" } }),
    }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow("Données extraites invalides");
  });

  it("throws when PDF has no extractable text", async () => {
    mock.module("pdf-parse", () => ({
      default: async (_buf: Buffer) => ({ text: "   " }),
    }));

    await expect(extractCvFromPdf(Buffer.from("fake"))).rejects.toThrow(
      "Aucun texte trouvé",
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd cvie-fr
bun test server/src/services/__tests__/cvImportService.test.ts
```

Expected: FAIL with "Cannot find module '../cvImportService'"

- [ ] **Step 3: Implement the service**

Create `server/src/services/cvImportService.ts`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import pdfParse from "pdf-parse";
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cvie-fr
bun test server/src/services/__tests__/cvImportService.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/services/cvImportService.ts server/src/services/__tests__/cvImportService.test.ts
git commit -m "feat: add CV PDF import service using Vercel AI SDK (anthropic/openai)"
```

---

## Task 3: Server — import route

**Files:**
- Create: `server/src/routes/cvImport.ts`
- Create: `server/src/routes/__tests__/cvImport.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/routes/__tests__/cvImport.test.ts`:

```typescript
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { Hono } from "hono";

const MOCK_CV = {
  personalInfo: {
    firstName: "Jean", lastName: "Dupont",
    email: "", phone: "", city: "", jobTitle: "", summary: "",
    linkedinUrl: "", portfolioUrl: "", photoUrl: "",
  },
  formations: [], experiences: [], skills: [], languages: [], interests: [],
};

const mockExtractCvFromPdf = mock(async (_buf: Buffer) => MOCK_CV);

mock.module("../../services/cvImportService", () => ({
  extractCvFromPdf: mockExtractCvFromPdf,
}));

import { cvImportRoutes } from "../cvImport";

const app = new Hono();
app.route("/import", cvImportRoutes);

function makePdfForm(bytes: Uint8Array = new Uint8Array([1, 2, 3])) {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), "cv.pdf");
  return fd;
}

describe("POST /import", () => {
  beforeEach(() => {
    mockExtractCvFromPdf.mockClear();
    // Simulate a valid API key being present
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.AI_PROVIDER = "anthropic";
  });

  it("returns 200 with CvData on valid PDF upload", async () => {
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: typeof MOCK_CV };
    expect(body.data.personalInfo.firstName).toBe("Jean");
  });

  it("returns 400 when no file provided", async () => {
    const res = await app.request("/import", { method: "POST", body: new FormData() });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("NO_FILE");
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    const res = await app.request("/import", {
      method: "POST",
      body: makePdfForm(new Uint8Array(6 * 1024 * 1024)),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("FILE_TOO_LARGE");
  });

  it("returns 400 when file is not a PDF", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([1])], { type: "image/png" }), "photo.png");
    const res = await app.request("/import", { method: "POST", body: fd });
    expect(res.status).toBe(400);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("INVALID_TYPE");
  });

  it("returns 503 when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(503);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 422 when extraction fails", async () => {
    mockExtractCvFromPdf.mockImplementationOnce(async () => {
      throw new Error("Aucun texte trouvé");
    });
    const res = await app.request("/import", { method: "POST", body: makePdfForm() });
    expect(res.status).toBe(422);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("EXTRACTION_FAILED");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd cvie-fr
bun test server/src/routes/__tests__/cvImport.test.ts
```

Expected: FAIL with "Cannot find module '../cvImport'"

- [ ] **Step 3: Implement the route**

Create `server/src/routes/cvImport.ts`:

```typescript
import { Hono } from "hono";
import { rateLimit } from "../middleware/rateLimit";
import { extractCvFromPdf } from "../services/cvImportService";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const CV_IMPORT_RATE_LIMIT_PER_MIN = (() => {
  const raw = process.env.CV_IMPORT_RATE_LIMIT_PER_MIN;
  if (!raw) return 5;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

function hasApiKey(): boolean {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const cvImportRoutes = new Hono();

cvImportRoutes.use("*", rateLimit({ max: CV_IMPORT_RATE_LIMIT_PER_MIN, windowMs: 60_000 }));

cvImportRoutes.post("/", async (c) => {
  if (!hasApiKey()) {
    console.error("[cv/import] AI API key not set for provider:", process.env.AI_PROVIDER ?? "anthropic");
    return c.json({ error: "Service d'import non configuré.", code: "SERVICE_UNAVAILABLE" }, 503);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Corps de requête invalide.", code: "BAD_REQUEST" }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json({ error: "Aucun fichier PDF fourni.", code: "NO_FILE" }, 400);
  }

  if (file.type !== "application/pdf") {
    return c.json({ error: "Le fichier doit être un PDF.", code: "INVALID_TYPE" }, 400);
  }

  if (file.size > MAX_PDF_BYTES) {
    return c.json({ error: "Le fichier dépasse la limite de 5 Mo.", code: "FILE_TOO_LARGE" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const cvData = await extractCvFromPdf(buffer);
    return c.json({ data: cvData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction échouée";
    console.error("[cv/import] extraction failed:", err);
    return c.json({ error: message, code: "EXTRACTION_FAILED" }, 422);
  }
});
```

- [ ] **Step 4: Register the route in index.ts**

In `server/src/index.ts`, add import after existing imports:

```typescript
import { cvImportRoutes } from "./routes/cvImport";
```

Add after `app.route("/api/v1/cv", cvRoutes);`:

```typescript
app.route("/api/v1/cv/import", cvImportRoutes);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd cvie-fr
bun test server/src/routes/__tests__/cvImport.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/cvImport.ts server/src/routes/__tests__/cvImport.test.ts server/src/index.ts
git commit -m "feat: add POST /api/v1/cv/import route with provider-agnostic API key check"
```

---

## Task 4: Client — useCvImport hook

**Files:**
- Create: `client/src/features/editor/hooks/useCvImport.ts`
- Create: `client/src/features/editor/hooks/__tests__/useCvImport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/features/editor/hooks/__tests__/useCvImport.test.ts`:

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCvImport } from "../useCvImport";

const mockReset = vi.fn();

vi.mock("react-hook-form", () => ({
  useFormContext: () => ({ reset: mockReset }),
}));

const mockCvData = {
  personalInfo: {
    firstName: "Jean", lastName: "Dupont",
    email: "", phone: "", city: "", jobTitle: "", summary: "",
    linkedinUrl: "", portfolioUrl: "", photoUrl: "",
  },
  formations: [], experiences: [], skills: [], languages: [], interests: [],
};

describe("useCvImport", () => {
  beforeEach(() => {
    mockReset.mockClear();
    vi.restoreAllMocks();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useCvImport());
    expect(result.current.status).toBe("idle");
  });

  it("calls form.reset with extracted CvData on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockCvData }),
    });

    const { result } = renderHook(() => useCvImport());
    const file = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });

    act(() => { result.current.importPdf(file); });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(mockReset).toHaveBeenCalledWith(mockCvData);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("sets error status when server returns error", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Aucun texte trouvé", code: "EXTRACTION_FAILED" }),
    });

    const { result } = renderHook(() => useCvImport());
    const file = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });

    act(() => { result.current.importPdf(file); });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Aucun texte trouvé");
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("rejects non-PDF file without network call", async () => {
    global.fetch = vi.fn();

    const { result } = renderHook(() => useCvImport());
    const file = new File(["data"], "photo.png", { type: "image/png" });

    act(() => { result.current.importPdf(file); });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Le fichier doit être un PDF.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd cvie-fr
bun test client/src/features/editor/hooks/__tests__/useCvImport.test.ts
```

Expected: FAIL with "Cannot find module '../useCvImport'"

- [ ] **Step 3: Implement the hook**

Create `client/src/features/editor/hooks/useCvImport.ts`:

```typescript
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CvData } from "@cvie/shared";

export type ImportStatus = "idle" | "loading" | "success" | "error";

export type UseCvImportReturn = {
  status: ImportStatus;
  error: string | null;
  importPdf: (file: File) => void;
};

export function useCvImport(): UseCvImportReturn {
  const { reset } = useFormContext<CvData>();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  function importPdf(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Le fichier doit être un PDF.");
      return;
    }

    setStatus("loading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/v1/cv/import", { method: "POST", body: formData })
      .then(async (res) => {
        const body = (await res.json()) as { data?: CvData; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Erreur inconnue");
        if (!body.data) throw new Error("Réponse serveur invalide");
        reset(body.data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur réseau");
        setStatus("error");
      });
  }

  return { status, error, importPdf };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cvie-fr
bun test client/src/features/editor/hooks/__tests__/useCvImport.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/features/editor/hooks/useCvImport.ts client/src/features/editor/hooks/__tests__/useCvImport.test.ts
git commit -m "feat: add useCvImport hook for PDF upload and form auto-fill"
```

---

## Task 5: Client — CvImportButton component

**Files:**
- Create: `client/src/features/editor/components/CvImportButton.tsx`
- Modify: `client/src/features/editor/components/CvEditor.tsx`

- [ ] **Step 1: Implement the component**

Create `client/src/features/editor/components/CvImportButton.tsx`:

```tsx
import { useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useCvImport } from "../hooks/useCvImport";

export function CvImportButton() {
  const { status, error, importPdf } = useCvImport();
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = status === "loading";

  const prevStatus = useRef(status);
  if (prevStatus.current !== status) {
    prevStatus.current = status;
    if (status === "success") {
      toast.success("CV importé ! Les champs ont été remplis automatiquement.", {
        id: "cv-import",
      });
    }
    if (status === "error") {
      toast.error(error ?? "Impossible d'analyser ce PDF.", { id: "cv-import" });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    toast.loading("Analyse du CV en cours…", { id: "cv-import" });
    importPdf(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Importer un CV PDF"
      />
      <button
        type="button"
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        title="Importer un CV existant (PDF)"
      >
        {isLoading ? (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current"
          />
        ) : (
          <Upload className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{isLoading ? "Analyse…" : "Importer un CV"}</span>
      </button>
    </>
  );
}
```

- [ ] **Step 2: Find where to insert CvImportButton in CvEditor**

Run this to find the exact line of the export/download button:

```bash
grep -n "Télécharger\|download\|pdf\|export\|toolbar\|header" cvie-fr/client/src/features/editor/components/CvEditor.tsx | head -20
```

- [ ] **Step 3: Add CvImportButton to CvEditor**

In `client/src/features/editor/components/CvEditor.tsx`:

Add import after the last existing component import:
```typescript
import { CvImportButton } from "./CvImportButton";
```

In the toolbar JSX (the flex container holding the export/template controls), add `<CvImportButton />` immediately before the PDF download button. Both buttons share the same flex row.

- [ ] **Step 4: Start dev server and test manually**

```bash
cd cvie-fr && bun run dev
```

1. Open editor at `http://localhost:5173`
2. Click "Importer un CV" — file picker opens
3. Select a real CV PDF
4. Loading spinner + "Analyse du CV en cours…" toast appear
5. After ~3-5 seconds: form fields populate from PDF
6. "CV importé !" success toast appears
7. Verify PDF export still works after import

- [ ] **Step 5: Type-check**

```bash
cd cvie-fr && bun run type-check
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add client/src/features/editor/components/CvImportButton.tsx client/src/features/editor/components/CvEditor.tsx
git commit -m "feat: add CvImportButton to editor toolbar for PDF auto-fill"
```

---

## Self-Review

**Spec coverage:**
- ✅ Upload PDF — `CvImportButton` hidden file input + click trigger
- ✅ Server-side text extraction — `pdf-parse` in `cvImportService.ts`
- ✅ AI analysis via Vercel AI SDK — `generateText` with `resolveModel()` selecting provider at runtime
- ✅ Swap provider — `AI_PROVIDER=anthropic|openai` + matching API key
- ✅ Auto-fill all fields — `form.reset(cvData)` triggers localStorage debounced persist
- ✅ Rate limiting — 5 req/min (configurable via `CV_IMPORT_RATE_LIMIT_PER_MIN`)
- ✅ File size limit — 5 MB max, 400 before any AI call
- ✅ User feedback — loading / success / error toasts via `sonner`
- ✅ Missing API key — 503 before touching file, clear log message
- ✅ Error propagation — service throws → route 422 → hook error state → toast

**Placeholder scan:** None found.

**Type consistency:**
- `extractCvFromPdf(pdfBuffer: Buffer): Promise<CvData>` — consistent across service, route, tests
- `useCvImport(): { status, error, importPdf }` — consistent across hook and component
- `CvData` from `@cvie/shared` everywhere, no local redefinition

---

## Prerequisites Before Running

1. Pick your provider and get an API key:
   - Anthropic (default): https://console.anthropic.com/ → `ANTHROPIC_API_KEY`
   - OpenAI: https://platform.openai.com/api-keys → `OPENAI_API_KEY`
2. Copy `.env.example` to `.env` and fill in the key + set `AI_PROVIDER`
3. Run `bun install` from repo root after Task 1 to install new packages
