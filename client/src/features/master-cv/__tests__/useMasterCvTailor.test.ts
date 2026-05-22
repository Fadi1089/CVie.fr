import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const authFetchMock = vi.fn();
vi.mock("@/features/auth/hooks/useAuthApi", () => ({
  useAuthApi: () => ({ fetch: authFetchMock }),
}));

import { useMasterCvTailor } from "../hooks/useMasterCvTailor";
import { pendingChangesHandoff } from "../pendingChangesHandoff";

function sseBody(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(`data: ${l}\n\n`));
      controller.close();
    },
  });
}

describe("useMasterCvTailor", () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it("collects tool summaries then completes on done and hands off pending changes", async () => {
    authFetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: sseBody([
        JSON.stringify({
          type: "tool",
          name: "setPersonalInfo",
          result: { ok: true, summary: "Profil sélectionné" },
        }),
        JSON.stringify({
          type: "done",
          cvId: "cv_x",
          pendingChanges: [{ path: "personalInfo.summary", before: "a", after: "b" }],
        }),
      ]),
    });
    const { result } = renderHook(() => useMasterCvTailor());
    await act(async () => {
      await result.current.start({
        title: "T",
        templateId: "x",
        jdText: "JD",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });
    });
    expect(result.current.events.map((e) => e.summary)).toContain("Profil sélectionné");
    expect(result.current.cvId).toBe("cv_x");
    expect(result.current.phase).toBe("done");
    const handed = pendingChangesHandoff.takeFor("cv_x");
    expect(handed).toEqual([{ path: "personalInfo.summary", before: "a", after: "b" }]);
  });

  it("sets error phase on non-ok response", async () => {
    authFetchMock.mockResolvedValueOnce({ ok: false, status: 412, body: null });
    const { result } = renderHook(() => useMasterCvTailor());
    await act(async () => {
      await result.current.start({
        title: "T",
        templateId: "x",
        jdText: "JD",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
      });
    });
    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("HTTP 412");
  });
});
