import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StampSaved } from "../StampSaved";

describe("StampSaved", () => {
  it("renders an aria-hidden decorative element", () => {
    render(<StampSaved />);
    expect(screen.getByTestId("stamp-saved")).toHaveAttribute("aria-hidden", "true");
  });

  it("applies the stamp-in animation class", () => {
    render(<StampSaved />);
    const node = screen.getByTestId("stamp-saved");
    expect(node.className).toMatch(/atelier-stamp/);
  });
});
