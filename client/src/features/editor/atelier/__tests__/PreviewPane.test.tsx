import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PreviewPane } from "../PreviewPane";
import { sampleCv } from "@cvie/shared";

describe("PreviewPane", () => {
  it("renders an iframe scaled to A4 aspect ratio", () => {
    const { container } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-balanced"
        customization={{}}
      />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("title")).toBe("Aperçu du CV");
  });

  it("writes the rendered HTML into the iframe document", async () => {
    const { container } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-balanced"
        customization={{}}
      />,
    );
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    await waitFor(() => {
      const doc = iframe.contentDocument!;
      expect(doc.body.textContent).toMatch(/Yasmine Benali/);
    });
  });

  it("shows the « bon à tirer » stamp when atsMode is ats-strict", () => {
    const { getByText } = render(
      <PreviewPane
        cv={sampleCv}
        themeId="atelier-classique"
        atsMode="ats-strict"
        customization={{}}
      />,
    );
    expect(getByText(/bon à tirer/i)).toBeInTheDocument();
  });
});
