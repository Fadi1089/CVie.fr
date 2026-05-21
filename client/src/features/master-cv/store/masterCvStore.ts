import type { CvData, MasterCvData } from "@cvie/shared";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type MasterCvStore = {
  load(): Promise<MasterCvData | null>;
  save(data: MasterCvData): Promise<MasterCvData>;
  seed(sourceCvIds: string[], pdfExtracted?: CvData): Promise<MasterCvData>;
};

export function createMasterCvStore(
  authFetch: AuthFetch = globalThis.fetch.bind(globalThis),
): MasterCvStore {
  return {
    async load() {
      const res = await authFetch("/api/v1/master-cv");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`load failed: ${res.status}`);
      const body = (await res.json()) as { data: MasterCvData };
      return body.data;
    },

    async save(data) {
      const res = await authFetch("/api/v1/master-cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      const body = (await res.json()) as { data: MasterCvData };
      return body.data;
    },

    async seed(sourceCvIds, pdfExtracted) {
      const res = await authFetch("/api/v1/master-cv/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCvIds, pdfExtracted }),
      });
      if (!res.ok) throw new Error(`seed failed: ${res.status}`);
      const body = (await res.json()) as { data: MasterCvData };
      return body.data;
    },
  };
}
