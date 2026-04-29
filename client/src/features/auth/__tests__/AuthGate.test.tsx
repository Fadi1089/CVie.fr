import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { useAuth0Mock } = vi.hoisted(() => ({ useAuth0Mock: vi.fn() }));
vi.mock("@auth0/auth0-react", () => ({ useAuth0: () => useAuth0Mock() }));

import { AuthGate } from "../components/AuthGate";

describe("AuthGate", () => {
  it("renders anon child when not authenticated", () => {
    useAuth0Mock.mockReturnValue({ isAuthenticated: false, isLoading: false });
    render(
      <AuthGate
        anon={<span>anon-content</span>}
        authed={<span>authed-content</span>}
      />,
    );
    expect(screen.getByText("anon-content")).toBeInTheDocument();
    expect(screen.queryByText("authed-content")).not.toBeInTheDocument();
  });

  it("renders authed child when authenticated", () => {
    useAuth0Mock.mockReturnValue({ isAuthenticated: true, isLoading: false });
    render(
      <AuthGate
        anon={<span>anon-content</span>}
        authed={<span>authed-content</span>}
      />,
    );
    expect(screen.getByText("authed-content")).toBeInTheDocument();
    expect(screen.queryByText("anon-content")).not.toBeInTheDocument();
  });

  it("renders nothing while SDK is loading (default)", () => {
    useAuth0Mock.mockReturnValue({ isAuthenticated: false, isLoading: true });
    const { container } = render(
      <AuthGate
        anon={<span>anon-content</span>}
        authed={<span>authed-content</span>}
      />,
    );
    expect(container.textContent).toBe("");
  });
});
