import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const getAccessTokenSilently = vi.fn(async () => "test-token");
const loginWithRedirect = vi.fn(async () => undefined);

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    getAccessTokenSilently,
    loginWithRedirect,
  }),
}));

import { useAuthApi } from "../hooks/useAuthApi";

describe("useAuthApi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    getAccessTokenSilently.mockClear();
    loginWithRedirect.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("injects Bearer token on authed calls", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { result } = renderHook(() => useAuthApi());
    await act(async () => {
      const res = await result.current.fetch("/api/v1/me");
      expect(res.ok).toBe(true);
    });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const auth = new Headers(init.headers).get("authorization");
    expect(auth).toBe("Bearer test-token");
  });

  it("returns 401 response without redirecting", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 401 }));
    const { result } = renderHook(() => useAuthApi());
    let res: Response | undefined;
    await act(async () => {
      res = await result.current.fetch("/api/v1/me");
    });
    expect(res?.status).toBe(401);
    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  it("does not inject Authorization header when not authenticated", async () => {
    vi.doMock("@auth0/auth0-react", () => ({
      useAuth0: () => ({
        isAuthenticated: false,
        getAccessTokenSilently: vi.fn(),
        loginWithRedirect,
      }),
    }));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const { useAuthApi: useAnonAuthApi } = await import("../hooks/useAuthApi");
    const { result } = renderHook(() => useAnonAuthApi());
    await act(async () => {
      await result.current.fetch("/api/v1/cv/pdf");
    });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBeNull();
  });
});
