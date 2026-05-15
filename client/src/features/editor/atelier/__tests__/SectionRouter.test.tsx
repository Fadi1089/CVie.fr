import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { sampleCvFixture } from "@cvie/shared";
import { SectionRouter } from "../forms/SectionRouter";

function Harness({ active }: { active: "personal" | "experiences" }) {
  const methods = useForm({ defaultValues: sampleCvFixture });
  return (
    <FormProvider {...methods}>
      <SectionRouter active={active} />
    </FormProvider>
  );
}

describe("SectionRouter", () => {
  it("renders PersonalInfoForm when active='personal'", () => {
    render(<Harness active="personal" />);
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
  });

  it("renders ExperiencesForm when active='experiences'", () => {
    render(<Harness active="experiences" />);
    expect(screen.getByText(/Ajouter une expérience/)).toBeInTheDocument();
  });
});
