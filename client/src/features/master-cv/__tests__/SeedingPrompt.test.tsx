import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeedingPrompt } from "../components/SeedingPrompt";

describe("SeedingPrompt", () => {
  it("lists user CVs as checkboxes", () => {
    render(
      <SeedingPrompt
        cvs={[
          { id: "cv1", title: "Dev backend", updatedAt: "2025-01-01" },
          { id: "cv2", title: "Lead tech", updatedAt: "2025-02-01" },
        ]}
        onSeed={vi.fn()}
        onSkip={vi.fn()}
        onPdf={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Dev backend/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lead tech/)).toBeInTheDocument();
  });

  it("calls onSeed with selected ids", () => {
    const onSeed = vi.fn();
    render(
      <SeedingPrompt
        cvs={[{ id: "cv1", title: "A", updatedAt: "" }]}
        onSeed={onSeed}
        onSkip={vi.fn()}
        onPdf={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/A/));
    fireEvent.click(screen.getByText(/Importer la sélection/));
    expect(onSeed).toHaveBeenCalledWith(["cv1"]);
  });

  it("Ignorer triggers onSkip", () => {
    const onSkip = vi.fn();
    render(
      <SeedingPrompt
        cvs={[]}
        onSeed={vi.fn()}
        onSkip={onSkip}
        onPdf={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText(/Ignorer/i));
    expect(onSkip).toHaveBeenCalled();
  });
});
