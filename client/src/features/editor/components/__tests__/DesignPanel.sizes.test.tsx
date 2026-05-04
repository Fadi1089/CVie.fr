import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { DesignPanel } from "../DesignPanel";
import type { CvData } from "@cvie/shared";

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
      <DesignPanel templateId="classique" />
    </FormProvider>
  );
}

describe("DesignPanel — Tailles", () => {
  it("renders four size sliders at 0", () => {
    render(<Harness />);
    expect(screen.getByRole("slider", { name: "Taille — Titre" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Sections" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Paragraphes" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Photo et QR" })).toHaveValue("0");
  });

  it("dragging a slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Taille — Paragraphes" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveValue("2");
    expect(screen.getByText(/\+2 pt/)).toBeInTheDocument();
  });

  it("reset button restores defaults and disables itself", () => {
    render(<Harness initial={{ appearance: { textSizes: { title: 3 }, mediaSize: 4 } }} />);
    const reset = screen.getByRole("button", { name: /Réinitialiser tailles/i });
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Taille — Titre" })).toHaveValue("0");
    expect(screen.getByRole("slider", { name: "Taille — Photo et QR" })).toHaveValue("0");
  });
});
