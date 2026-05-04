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

describe("DesignPanel — Espacements", () => {
  it("renders four spacing sliders at 0", () => {
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
    expect(
      screen.getByRole("slider", { name: "Espacement — Interligne" }),
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

  it("dragging the lineHeight slider updates the displayed value", () => {
    render(<Harness />);
    const slider = screen.getByRole("slider", { name: "Espacement — Interligne" });
    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(slider).toHaveValue("0.2");
    expect(screen.getByText(/\+0\.20/)).toBeInTheDocument();
  });

  it("reset button restores defaults and disables itself", () => {
    render(
      <Harness
        initial={{ appearance: { spacing: { pageMargin: 3, lineHeight: 0.1 } } }}
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
    expect(
      screen.getByRole("slider", { name: "Espacement — Interligne" }),
    ).toHaveValue("0");
  });
});
