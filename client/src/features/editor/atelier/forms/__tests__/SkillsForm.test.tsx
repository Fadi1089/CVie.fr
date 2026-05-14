import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { sampleCvFixture } from "@cvie/shared";
import { SkillsForm } from "../SkillsForm";

function Harness() {
  const methods = useForm({ defaultValues: sampleCvFixture });
  return (
    <FormProvider {...methods}>
      <SkillsForm />
    </FormProvider>
  );
}

describe("SkillsForm", () => {
  it("renders one card per existing entry", () => {
    render(<Harness />);
    // sampleCv has 3 skills
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByDisplayValue("TypeScript")).toBeInTheDocument();
  });

  it("append adds an entry", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("+ Ajouter une compétence"));
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("remove drops an entry", () => {
    render(<Harness />);
    const articles = screen.getAllByRole("article");
    const firstCardRemove = within(articles[0]!).getByLabelText("Supprimer");
    fireEvent.click(firstCardRemove);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("swap reorders entries", () => {
    render(<Harness />);
    const articles = screen.getAllByRole("article");
    const down = within(articles[0]!).getByLabelText("Déplacer ↓");
    fireEvent.click(down);
    const updatedArticles = screen.getAllByRole("article");
    expect(within(updatedArticles[1]!).getByDisplayValue("TypeScript")).toBeInTheDocument();
  });
});
