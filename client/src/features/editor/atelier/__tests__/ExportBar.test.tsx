import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportBar } from "../ExportBar";
import { themeRegistry } from "@cvie/shared";

const themes = themeRegistry.map((t) => t.meta);

describe("ExportBar", () => {
  it("renders a chip for every theme", () => {
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    expect(screen.getByText("Atelier — Classique")).toBeInTheDocument();
    expect(screen.getByText("Atelier — Moderne")).toBeInTheDocument();
    expect(screen.getByText("Atelier — Minimaliste")).toBeInTheDocument();
  });

  it("invokes onThemeChange on chip click", () => {
    const fn = vi.fn();
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={fn}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    fireEvent.click(screen.getByText("Atelier — Moderne"));
    expect(fn).toHaveBeenCalledWith("atelier-moderne");
  });

  it("invokes onAtsModeChange on toggle click", () => {
    const fn = vi.fn();
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={fn}
        onExport={() => {}}
        exporting={false}
      />,
    );
    fireEvent.click(screen.getByText(/strict/i));
    expect(fn).toHaveBeenCalledWith("ats-strict");
  });

  it("disables the export button when exporting=true", () => {
    render(
      <ExportBar
        themes={themes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting
      />,
    );
    expect(screen.getByRole("button", { name: /exporter/i })).toBeDisabled();
  });

  it("shows a premium lock icon for premium themes", () => {
    const premiumThemes = themes.map((t, i) => (i === 1 ? { ...t, tier: "premium" as const } : t));
    render(
      <ExportBar
        themes={premiumThemes}
        activeThemeId="atelier-classique"
        atsMode="ats-balanced"
        onThemeChange={() => {}}
        onAtsModeChange={() => {}}
        onExport={() => {}}
        exporting={false}
      />,
    );
    expect(screen.getByTestId("premium-lock-atelier-moderne")).toBeInTheDocument();
  });
});
