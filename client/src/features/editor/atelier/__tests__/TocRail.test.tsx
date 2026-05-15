import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TocRail, type SectionId } from "../TocRail";

const sections: { id: SectionId; label: string }[] = [
  { id: "personal", label: "Informations personnelles" },
  { id: "formations", label: "Formation" },
  { id: "experiences", label: "Expériences" },
  { id: "skills", label: "Compétences" },
  { id: "languages", label: "Langues" },
  { id: "interests", label: "Intérêts" },
];

describe("TocRail", () => {
  it("renders each section with a two-digit numeral", () => {
    render(<TocRail sections={sections} active="personal" onSelect={() => {}} />);
    expect(screen.getByText("01.")).toBeInTheDocument();
    expect(screen.getByText("06.")).toBeInTheDocument();
  });

  it("marks the active section with aria-current=true", () => {
    render(<TocRail sections={sections} active="experiences" onSelect={() => {}} />);
    expect(screen.getByText("Expériences").closest("button")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("calls onSelect with the clicked section id", () => {
    const fn = vi.fn();
    render(<TocRail sections={sections} active="personal" onSelect={fn} />);
    fireEvent.click(screen.getByText("Compétences"));
    expect(fn).toHaveBeenCalledWith("skills");
  });

  it("shows a stamp marker for the section last saved (savedSection prop)", () => {
    render(
      <TocRail sections={sections} active="personal" savedSection="formations" onSelect={() => {}} />,
    );
    expect(screen.getByTestId("toc-stamp-formations")).toBeInTheDocument();
  });
});
