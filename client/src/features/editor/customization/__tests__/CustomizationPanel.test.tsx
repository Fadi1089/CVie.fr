import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomizationPanel } from "../CustomizationPanel";
import { themeRegistry } from "@cvie/shared";

const classique = themeRegistry.find((t) => t.meta.id === "atelier-classique")!;

describe("CustomizationPanel", () => {
  it("renders one radio group per enum field in the theme schema", () => {
    render(
      <CustomizationPanel
        theme={classique.meta}
        value={classique.meta.defaultCustomization}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /accent/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /densit/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /photo/i })).toBeInTheDocument();
  });

  it("calls onChange with the new value on chip click", () => {
    const fn = vi.fn();
    render(
      <CustomizationPanel
        theme={classique.meta}
        value={classique.meta.defaultCustomization}
        onChange={fn}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "encre" }));
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ accent: "encre" }));
  });

  it("renders an empty panel for a theme with no exposed knobs (minimaliste has only 'density')", () => {
    const minimaliste = themeRegistry.find((t) => t.meta.id === "atelier-minimaliste")!;
    render(
      <CustomizationPanel
        theme={minimaliste.meta}
        value={minimaliste.meta.defaultCustomization}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /densit/i })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /accent/i })).not.toBeInTheDocument();
  });
});
