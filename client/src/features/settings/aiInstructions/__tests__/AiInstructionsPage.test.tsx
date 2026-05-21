import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/features/auth/hooks/useAuthApi", () => ({
  useAuthApi: () => ({ fetch: globalThis.fetch }),
}));

import { AiInstructionsPage } from "../AiInstructionsPage";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("AiInstructionsPage", () => {
  it("loads and displays existing text", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: "écris formel" }) });
    render(<AiInstructionsPage />);
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("écris formel");
    });
  });

  it("PUTs on edit after debounce", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: "" }) });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: "nouveau" }) });
    render(<AiInstructionsPage />);
    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nouveau" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/ai-instructions",
        expect.objectContaining({ method: "PUT" }),
      );
    }, { timeout: 2000 });
  });

  it("shows char counter and blocks >4000 input", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: "" }) });
    render(<AiInstructionsPage />);
    await waitFor(() => screen.getByRole("textbox"));
    expect(screen.getByText(/0 \/ 4000/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "x".repeat(4001) } });
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(4000);
  });
});
