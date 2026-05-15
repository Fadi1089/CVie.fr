import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SmallCapsLabel } from "../SmallCapsLabel";
import { TextInput } from "../TextInput";
import { TextArea } from "../TextArea";
import { DateInput } from "../DateInput";
import { Marginalia } from "../Marginalia";

describe("SmallCapsLabel", () => {
  it("renders children in small caps", () => {
    render(<SmallCapsLabel htmlFor="x">Prénom</SmallCapsLabel>);
    const label = screen.getByText("Prénom");
    expect(label).toHaveAttribute("for", "x");
    expect(label).toHaveStyle({ fontVariant: "small-caps" });
  });
});

describe("TextInput", () => {
  it("calls onChange with the new value", () => {
    let v = "";
    render(<TextInput value="" onChange={(next) => (v = next)} label="Test" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Yasmine" } });
    expect(v).toBe("Yasmine");
  });

  it("renders a bottom-rule input (no full border)", () => {
    render(<TextInput value="" onChange={() => {}} label="Test" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-b/);
    expect(input.className).not.toMatch(/border\s/);
  });
});

describe("TextArea", () => {
  it("renders as a multiline input", () => {
    render(<TextArea value="" onChange={() => {}} label="Test" rows={4} />);
    const ta = screen.getByRole("textbox");
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveAttribute("rows", "4");
  });
});

describe("DateInput", () => {
  it("renders an empty input for empty value", () => {
    render(<DateInput value="" onChange={() => {}} label="Date" />);
    const input = screen.getByLabelText("Date") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("renders 'présent' for the present sentinel", () => {
    render(<DateInput value="present" onChange={() => {}} label="Date" />);
    const input = screen.getByLabelText("Date") as HTMLInputElement;
    expect(input.value).toBe("présent");
  });

  it("normalises typed YYYY-MM correctly", () => {
    let v = "";
    render(<DateInput value="" onChange={(next) => (v = next)} label="Date" />);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "03/2024" } });
    fireEvent.blur(screen.getByLabelText("Date"));
    expect(v).toBe("2024-03");
  });
});

describe("Marginalia", () => {
  it("renders italic error text in the right margin", () => {
    render(<Marginalia kind="error">Champ obligatoire</Marginalia>);
    const node = screen.getByText("Champ obligatoire");
    expect(node).toHaveStyle({ fontStyle: "italic" });
  });
});
