import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cvDataSchema, sampleCvFixture } from "@cvie/shared";
import { PersonalInfoForm } from "../PersonalInfoForm";

function Harness() {
  const methods = useForm({ defaultValues: sampleCvFixture, resolver: zodResolver(cvDataSchema), mode: "onBlur" });
  return (
    <FormProvider {...methods}>
      <PersonalInfoForm />
    </FormProvider>
  );
}

describe("PersonalInfoForm", () => {
  it("renders all required fields", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nom$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
  });

  it("propagates typed values into the form context", () => {
    render(<Harness />);
    const first = screen.getByLabelText(/Prénom/i) as HTMLInputElement;
    fireEvent.change(first, { target: { value: "Camille" } });
    expect(first.value).toBe("Camille");
  });

  it("shows a marginalia error when an invalid URL is entered", async () => {
    render(<Harness />);
    const linkedin = screen.getByLabelText(/LinkedIn/i) as HTMLInputElement;
    fireEvent.change(linkedin, { target: { value: "not-a-url" } });
    fireEvent.blur(linkedin);
    expect(await screen.findByText(/URL/)).toBeInTheDocument();
  });
});
