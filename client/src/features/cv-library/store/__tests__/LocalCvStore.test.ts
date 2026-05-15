import { beforeEach, describe, expect, it } from "vitest";
import { LocalCvStore } from "../LocalCvStore";
import type { CvData } from "@cvie/shared";

// Map-backed Storage polyfill — vitest 4 + jsdom 29 ship a partial
// localStorage that's missing setItem/clear in worker pool mode. Inject our
// own deterministic implementation per test.
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
  themeId: "atelier-classique",
  customization: {},
};

describe("LocalCvStore (anon namespace)", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("listActive returns the seeded library when none exists", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    const list = await store.listActive();
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("cv-main");
  });

  it("create writes both library entry and draft", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    const rec = await store.create(
      { title: "Test", templateId: "classique" },
      SAMPLE,
    );
    expect(rec.id.startsWith("cv-")).toBe(true);
    const body = await store.read(rec.id);
    expect(body?.personalInfo.firstName).toBe("A");
  });

  it("patch updates body draft and emits status saved", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    const created = await store.create(
      { title: "T", templateId: "classique" },
      SAMPLE,
    );
    const events: string[] = [];
    const off = store.subscribeStatus((s) => events.push(s));
    await store.patch(created.id, {
      data: {
        ...SAMPLE,
        personalInfo: { ...SAMPLE.personalInfo, firstName: "Z" },
      },
    });
    off();
    expect(events).toContain("saved");
  });

  it("hardDeleteCv removes the record from library and draft storage", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    const created = await store.create(
      { title: "T", templateId: "classique" },
      SAMPLE,
    );
    await store.hardDeleteCv(created.id);
    const list = await store.listActive();
    expect(list.find((r) => r.id === created.id)).toBeUndefined();
    const body = await store.read(created.id);
    expect(body).toBeNull();
  });

  it("listFolders returns empty (folders unsupported in anon)", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    expect(await store.listFolders()).toEqual([]);
  });

  it("createFolder throws NOT_SUPPORTED", async () => {
    const store = new LocalCvStore({ namespace: "anon", storage });
    await expect(store.createFolder("X")).rejects.toMatchObject({
      code: "NOT_SUPPORTED",
    });
  });

  it("namespace separation: 'user-abc' and 'anon' don't collide", async () => {
    const anon = new LocalCvStore({ namespace: "anon", storage });
    const user = new LocalCvStore({ namespace: "user-abc", storage });
    await anon.create({ title: "Anon", templateId: "classique" }, SAMPLE);
    const userList = await user.listActive();
    expect(userList.find((r) => r.title === "Anon")).toBeUndefined();
  });
});
