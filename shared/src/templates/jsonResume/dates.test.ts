import { describe, it, expect } from "vitest";
import { cvDateToIso, isoDateToHuman, formatDateRange } from "./dates";

describe("cvDateToIso", () => {
  it("passes ISO month strings through", () => {
    expect(cvDateToIso("2024-03")).toBe("2024-03");
  });
  it("maps 'present' to undefined (JSON Resume convention)", () => {
    expect(cvDateToIso("present")).toBeUndefined();
  });
  it("maps empty strings to undefined", () => {
    expect(cvDateToIso("")).toBeUndefined();
  });
});

describe("isoDateToHuman", () => {
  it("renders French month names by default", () => {
    expect(isoDateToHuman("2024-03", "fr")).toBe("mars 2024");
  });
  it("renders English month names when locale is en", () => {
    expect(isoDateToHuman("2024-03", "en")).toBe("Mar 2024");
  });
  it("returns the raw ISO date for unknown locales (no crash)", () => {
    expect(isoDateToHuman("2024-03", "xx" as never)).toBe("2024-03");
  });
});

describe("formatDateRange", () => {
  it("renders 'mars 2024 — présent' when endDate is undefined", () => {
    expect(formatDateRange("2024-03", undefined, "fr")).toBe(
      "mars 2024 — présent",
    );
  });
  it("renders the full range when both dates are present", () => {
    expect(formatDateRange("2020-01", "2024-03", "fr")).toBe(
      "janv. 2020 — mars 2024",
    );
  });
  it("renders only the end date when start is missing", () => {
    expect(formatDateRange(undefined, "2024-03", "fr")).toBe("mars 2024");
  });
});
