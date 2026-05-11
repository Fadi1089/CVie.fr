import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { EditKeyModal } from "../EditKeyModal";

describe("EditKeyModal", () => {
  it("rejects an invalid prefix inline (no submit fired)", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <EditKeyModal
        provider="anthropic"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );
    const input = screen.getByLabelText(/Clé API Anthropic/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "wrong-prefix-abcdef1234" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/sk-ant-/);
  });

  it("calls onSubmit with valid key", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <EditKeyModal
        provider="anthropic"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );
    const input = screen.getByLabelText(/Clé API Anthropic/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-ant-abc123def456WXYZ" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledWith("sk-ant-abc123def456WXYZ");
  });

  it("validates google AIza prefix", () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <EditKeyModal
        provider="google"
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );
    const input = screen.getByLabelText(/Clé API Google/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-shouldnt-work-here1234" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/AIza/);
  });
});
