import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Workspace } from "../Workspace";
import { sampleCvFixture } from "@cvie/shared";

describe("Workspace", () => {
  it("renders the TOC, the active section, and the preview", () => {
    render(<Workspace cv={sampleCvFixture} onPatch={vi.fn()} onExport={vi.fn()} />);
    expect(screen.getByLabelText("Plan du CV")).toBeInTheDocument();
    expect(screen.getByLabelText("Aperçu du CV")).toBeInTheDocument();
    expect(screen.getByLabelText(/Prénom/i)).toBeInTheDocument();
  });

  it("switches the active section when a TOC entry is clicked", () => {
    render(<Workspace cv={sampleCvFixture} onPatch={vi.fn()} onExport={vi.fn()} />);
    fireEvent.click(screen.getByText("Expériences"));
    expect(screen.getByText(/Ajouter une expérience/)).toBeInTheDocument();
  });

  it("invokes onExport when the export button is clicked", async () => {
    const fn = vi.fn();
    render(<Workspace cv={sampleCvFixture} onPatch={vi.fn()} onExport={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /exporter/i }));
    expect(fn).toHaveBeenCalled();
  });
});
