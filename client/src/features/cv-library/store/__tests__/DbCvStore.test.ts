import { beforeEach, describe, expect, it, vi } from "vitest";
import { DbCvStore } from "../DbCvStore";
import { LocalCvStore } from "../LocalCvStore";
import type { CvData } from "@cvie/shared";

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
}

const SAMPLE: CvData = {
  personalInfo: { firstName: "A", lastName: "B", portfolioDisplay: "clickable" },
  formations: [],
  experiences: [],
  skills: [],
  languages: [],
  interests: [],
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("DbCvStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let local: LocalCvStore;
  let store: DbCvStore;
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
    fetchMock = vi.fn();
    local = new LocalCvStore({ namespace: "user-test", storage });
    store = new DbCvStore({
      namespace: "user-test",
      local,
      fetch: fetchMock as unknown as typeof fetch,
      retry: { initialMs: 1, maxMs: 4 },
    });
  });

  it("listActive fetches and replaces local cache", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cvs: [
          {
            id: "cv_1",
            title: "Server",
            templateId: "classique",
            folderId: "f_d",
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const list = await store.listActive();
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("cv_1");
  });

  it("patch dual-writes: localStorage immediately, server PATCHes", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          userId: "u",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    await store.patch("cv_1", { data: SAMPLE });
    const body = await local.read("cv_1");
    expect(body?.personalInfo.firstName).toBe("A");
    expect(fetchMock).toHaveBeenCalled();
    const url = fetchMock.mock.calls[0]?.[0];
    expect(String(url)).toContain("/api/v1/cv/cv_1");
  });

  it("emits 'offline' when fetch fails and retries on online event", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    // Fire-and-forget — patch promise won't resolve until a fetch succeeds.
    const pending = store.patch("cv_1", { data: SAMPLE });
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toContain("offline");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    window.dispatchEvent(new Event("online"));
    await pending;
    expect(events).toContain("saved");
    off();
  });

  it("emits 'error' on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "x", code: "UNAUTHENTICATED" }, { status: 401 }),
    );
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    await expect(store.patch("cv_1", { data: SAMPLE })).rejects.toBeDefined();
    await new Promise((r) => setTimeout(r, 10));
    off();
    expect(events).toContain("error");
  });

  it("collapses successive patches into a single in-flight request", async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((res) => {
          resolveFirst = res;
        }),
    );
    const p1 = store.patch("cv_1", {
      data: { ...SAMPLE, personalInfo: { ...SAMPLE.personalInfo, firstName: "1" } },
    });
    const p2 = store.patch("cv_1", {
      data: { ...SAMPLE, personalInfo: { ...SAMPLE.personalInfo, firstName: "2" } },
    });
    // Drain microtasks so the local-cache writes complete and `flush` fires.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    resolveFirst(
      jsonResponse({
        cv: {
          id: "cv_1",
          folderId: "f",
          title: "T",
          templateId: "classique",
          data: SAMPLE,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
