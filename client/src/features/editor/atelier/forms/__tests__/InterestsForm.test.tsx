import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { sampleCvFixture } from "@cvie/shared";
import { InterestsForm } from "../InterestsForm";

function Harness() {
  const methods = useForm({ defaultValues: sampleCvFixture });
  return (
    <FormProvider {...methods}>
      <InterestsForm />
    </FormProvider>
  );
}

describe("InterestsForm", () => {
  it("renders one card per existing entry", () => {
    render(<Harness />);
    // sampleCv has 1 interest
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByDisplayValue("Lecture éditoriale")).toBeInTheDocument();
  });

  it("append adds an entry", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("+ Ajouter un centre d'intérêt"));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("remove drops an entry", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("+ Ajouter un centre d'intérêt"));
    const articles = screen.getAllByRole("article");
    const firstCardRemove = within(articles[0]!).getByLabelText("Supprimer");
    fireEvent.click(firstCardRemove);
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("swap reorders entries", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("+ Ajouter un centre d'intérêt"));
    const articles = screen.getAllByRole("article");
    const down = within(articles[0]!).getByLabelText("Déplacer ↓");
    fireEvent.click(down);
    const updatedArticles = screen.getAllByRole("article");
    expect(within(updatedArticles[1]!).getByDisplayValue("Lecture éditoriale")).toBeInTheDocument();
  });
});
