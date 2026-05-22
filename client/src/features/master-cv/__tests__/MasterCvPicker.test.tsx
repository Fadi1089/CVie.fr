import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasterCvPicker } from "../components/MasterCvPicker";
import { createEmptyMaster } from "@cvie/shared";

const master = (() => {
  const m = createEmptyMaster("A", "B");
  m.experiences.push({
    id: "mexp_1", jobTitle: "Lead", company: "Acme", startDate: "2022-01", endDate: "present",
    bullets: [], achievements: ["A1", "A2"], tags: [],
  });
  m.skills.push({ id: "msk_1", name: "TS", tags: [] });
  return m;
})();

describe("MasterCvPicker", () => {
  it("counters update as user checks items", () => {
    render(<MasterCvPicker master={master} onCancel={vi.fn()} onCreate={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/Lead, Acme/));
    expect(screen.getByText(/1 \/ 1 sélectionnée/)).toBeInTheDocument();
  });

  it("Créer is disabled when nothing is picked", () => {
    render(<MasterCvPicker master={master} onCancel={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText("Créer")).toBeDisabled();
  });

  it("assembles CvData with picked items only", () => {
    const onCreate = vi.fn();
    render(<MasterCvPicker master={master} onCancel={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByLabelText(/Lead, Acme/));
    fireEvent.click(screen.getByLabelText("A1"));
    fireEvent.click(screen.getByLabelText("TS"));
    fireEvent.click(screen.getByText("Créer"));
    const data = onCreate.mock.calls[0][0];
    expect(data.experiences[0].jobTitle).toBe("Lead");
    expect(data.experiences[0].bullets).toEqual(["A1"]);
    expect(data.skills[0].name).toBe("TS");
  });
});
