import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { DesignPanel } from "../DesignPanel";
import { getTheme } from "@cvie/shared";
import type { CvData } from "@cvie/shared";

const stackoverflowTheme = getTheme("community-stackoverflow")!.meta;

function Harness({ initial }: { initial?: Partial<CvData> }) {
  const form = useForm<CvData>({
    defaultValues: {
      personalInfo: {
        firstName: "A",
        lastName: "B",
        portfolioDisplay: "clickable",
      },
      formations: [],
      experiences: [],
      skills: [],
      languages: [],
      interests: [],
      ...initial,
    },
  });
  return (
    <FormProvider {...form}>
      <DesignPanel theme={stackoverflowTheme} />
    </FormProvider>
  );
}

describe("DesignPanel — Espacements", () => {
  it("renders three spacing sliders at 0", () => {
    render(<Harness />);
    expect(
      screen.getByRole("slider", { name: "Espacement — Marge de page" }),
    ).toHaveValue("0");
    expect(
      screen.getByRole("slider", { name: "Espacement — Espacement des sections" }),
    ).toHaveValue("0");
    expect(
      screen.getByRole("slider", { name: "Espacement — Espacement des éléments" }),
    ).toHaveValue("0");
  });

  it("dragging an mm slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", {
      name: "Espacement — Espacement des sections",
    });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveValue("2");
    expect(screen.getByText(/\+2 mm/)).toBeInTheDocument();
  });

  it("dragging the base line-height slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Interligne — Corps" });
    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(slider).toHaveValue("0.2");
    expect(screen.getByText(/\+0\.20/)).toBeInTheDocument();
  });

  it("reset button restores spacing defaults and disables itself", () => {
    render(
      <Harness
        initial={{ appearance: { spacing: { pageMargin: 3 } } }}
      />,
    );
    const reset = screen.getByRole("button", { name: /Réinitialiser espacements/i });
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(
      screen.getByRole("slider", { name: "Espacement — Marge de page" }),
    ).toHaveValue("0");
    expect(
      screen.getByRole("slider", { name: "Espacement — Espacement des sections" }),
    ).toHaveValue("0");
    expect(
      screen.getByRole("slider", { name: "Espacement — Espacement des éléments" }),
    ).toHaveValue("0");
  });

  it("Réinitialiser interlignes resets only line-height sliders and disables itself", () => {
    render(
      <Harness
        initial={{ appearance: { lineHeights: { base: 0.2 } } }}
      />,
    );
    const reset = screen.getByRole("button", { name: /Réinitialiser interlignes/i });
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Interligne — Titres" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Interligne — Compact" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Interligne — Corps" })).toHaveValue("0");
  });
});
