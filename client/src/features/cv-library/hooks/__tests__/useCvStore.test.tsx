import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const useAuth0Mock = vi.fn();
vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => useAuth0Mock() }));
vi.mock("@/features/auth/hooks/useAuthApi", () => ({
  useAuthApi: () => ({ fetch: globalThis.fetch }),
}));

import { useCvStore } from "../useCvStore";
import { LocalCvStore } from "../../store/LocalCvStore";
import { DbCvStore } from "../../store/DbCvStore";

describe("useCvStore", () => {
  it("returns LocalCvStore when not authenticated", () => {
    useAuth0Mock.mockReturnValue({ isAuthenticated: false, user: undefined });
    const { result } = renderHook(() => useCvStore());
    expect(result.current).toBeInstanceOf(LocalCvStore);
  });

  it("returns DbCvStore when authenticated with sub", () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|123" },
    });
    const { result } = renderHook(() => useCvStore());
    expect(result.current).toBeInstanceOf(DbCvStore);
  });

  it("rebuilds the store when sub changes", () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|a" },
    });
    const { result, rerender } = renderHook(() => useCvStore());
    const first = result.current;
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      user: { sub: "auth0|b" },
    });
    rerender();
    expect(result.current).not.toBe(first);
  });
});
