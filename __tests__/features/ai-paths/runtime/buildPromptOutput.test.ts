import { describe, it, expect } from "vitest";

import { buildPromptOutput } from "@/features/ai/ai-paths/lib";

describe("buildPromptOutput", () => {
  it("resolves {{result}} from nodeInputs.result", () => {
    const { promptOutput } = buildPromptOutput(
      { template: "Prev result: {{result}}" },
      { result: "hello" }
    );
    expect(promptOutput).toBe("Prev result: hello");
  });

  it("resolves {{value}} from nodeInputs.result (current value)", () => {
    const { promptOutput } = buildPromptOutput(
      { template: "Prev value: {{value}}" },
      { result: "abc" }
    );
    expect(promptOutput).toBe("Prev value: abc");
  });
});

