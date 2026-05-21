import { describe, expect, it, mock } from "bun:test";
import { sampleCv } from "@cvie/shared";

// Replace the aiInstructions module so we can assert how cvAssistantService
// calls it. mock.module must run before the service module is imported.
const buildUserInstructionsBlockSpy = mock(
  async (_userId: string) => "INSTRUCTIONS UTILISATEUR:\nMOCK",
);
mock.module("../aiInstructions", () => ({
  buildUserInstructionsBlock: buildUserInstructionsBlockSpy,
}));

const { runAssistant } = await import("../cvAssistantService");

describe("runAssistant — user instructions injection", () => {
  it("calls buildUserInstructionsBlock with the userId", async () => {
    try {
      await runAssistant({
        userId: "user_42",
        cv: sampleCv,
        messages: [
          { role: "user", parts: [{ type: "text", text: "hi" }] },
        ] as never,
        provider: "anthropic",
        apiKey: "sk-test",
        model: "claude-sonnet-4-6",
      });
    } catch {
      // The model call may fail (no real network/invalid key); we only need
      // to assert that the helper was called before the failure.
    }
    expect(buildUserInstructionsBlockSpy).toHaveBeenCalledWith("user_42");
  });
});
