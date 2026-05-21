import { describe, expect, it, mock } from "bun:test";
import { sampleCv } from "@cvie/shared";

// Mock the AI module BEFORE importing translateCv so the model call is
// intercepted and we never hit the network. Returning an empty JSON object
// makes the schema parse fail — that's fine, because we only need to assert
// that buildUserInstructionsBlock was (or wasn't) called before the failure.
mock.module("ai", () => ({
  generateText: async () => ({ text: "{}" }),
}));

const buildUserInstructionsBlockSpy = mock(
  async (_userId: string) => "INSTRUCTIONS UTILISATEUR:\nMOCK",
);
mock.module("../aiInstructions", () => ({
  buildUserInstructionsBlock: buildUserInstructionsBlockSpy,
}));

const { translateCv } = await import("../cvTranslateService");

describe("translateCv — user instructions injection", () => {
  it("calls buildUserInstructionsBlock when userId is provided", async () => {
    buildUserInstructionsBlockSpy.mockClear();
    try {
      await translateCv({
        userId: "user_99",
        cv: sampleCv,
        target: "en",
        provider: "anthropic",
        apiKey: "sk-test",
        model: "claude-sonnet-4-6",
      });
    } catch {
      // The translation will fail parsing (empty object isn't a valid CV);
      // we only verify the helper was called.
    }
    expect(buildUserInstructionsBlockSpy).toHaveBeenCalledWith("user_99");
  });

  it("skips buildUserInstructionsBlock when userId is null (anonymous user)", async () => {
    buildUserInstructionsBlockSpy.mockClear();
    try {
      await translateCv({
        userId: null,
        cv: sampleCv,
        target: "en",
        provider: "anthropic",
        apiKey: "sk-test",
        model: "claude-sonnet-4-6",
      });
    } catch {
      // ignore parse failure
    }
    expect(buildUserInstructionsBlockSpy).not.toHaveBeenCalled();
  });
});
