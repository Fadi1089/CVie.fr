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

describe("DesignPanel — Tailles", () => {
  it("renders nine size sliders at 0", () => {
    render(<Harness />);
    expect(screen.getByRole("slider", { name: "Taille — Nom" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Sous-titre" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Sections" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Postes" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Cartes" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Corps" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Métadonnées" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Photo" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — QR" })).toHaveValue("0");
  });

  it("dragging a slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Taille — Corps" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveValue("2");
    expect(screen.getByText(/\+2 pt/)).toBeInTheDocument();
  });

  it("reset button restores defaults and disables itself", () => {
    render(<Harness initial={{ appearance: { textSizes: { name: 3 }, mediaSize: 4 } }} />);
    const reset = screen.getByRole("button", { name: /Réinitialiser tailles/i });
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Taille — Nom" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Photo" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — QR" })).toHaveValue("0");
  });
});
