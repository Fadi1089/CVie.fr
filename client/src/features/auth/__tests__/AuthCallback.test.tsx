import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const { useAuth0Mock, toastError } = vi.hoisted(() => ({
  useAuth0Mock: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => useAuth0Mock(),
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { AuthCallback } from "../routes/AuthCallback";

describe("AuthCallback", () => {
  beforeEach(() => {
    useAuth0Mock.mockReset();
    toastError.mockClear();
  });

  it("renders progress while SDK is loading", () => {
    useAuth0Mock.mockReturnValue({ isLoading: true, error: null });
    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>,
    );
    expect(screen.getByText(/connexion/i)).toBeInTheDocument();
  });

  it("toasts and renders the failure state when SDK reports an error", async () => {
    useAuth0Mock.mockReturnValue({
      isLoading: false,
      error: new Error("login failed"),
    });
    render(
      <MemoryRouter>
        <AuthCallback />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Connexion échouée. Réessayez.");
    });
    expect(screen.getByText(/échec/i)).toBeInTheDocument();
  });
});
