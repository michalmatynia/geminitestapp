import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateGraph } from "@/features/ai-paths/lib/core/runtime/engine";
import type { AiNode, Edge } from "@/shared/types/ai-paths";

describe("AI Paths Runtime Engine", () => {
  const mockFetchEntityByType = vi.fn();
  const mockReportAiPathsError = vi.fn();
  const mockToast = vi.fn();

  const defaultOptions = {
    activePathId: "test-path",
    fetchEntityByType: mockFetchEntityByType,
    reportAiPathsError: mockReportAiPathsError,
    toast: mockToast,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute a simple linear graph", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Const",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: "string", value: "hello" } },
      },
      {
        id: "node-2",
        type: "mapper",
        title: "Mapper",
        description: "",
        inputs: ["context"],
        outputs: ["out"],
        position: { x: 100, y: 0 },
        config: {
          mapper: {
            outputs: ["out"],
            mappings: { out: "$.val" },
          },
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: "e1",
        from: "node-1",
        to: "node-2",
        fromPort: "value",
        toPort: "context",
      },
    ];

    // Note: handleMapper expects context to be an object. 
    // We update node-1 to return an object.
    nodes[0]!.config!.constant!.value = JSON.stringify({ val: "mapped" });
    nodes[0]!.config!.constant!.valueType = "json";

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["node-1"]).toEqual({ value: { val: "mapped" } });
    expect(result.outputs["node-2"]).toEqual({ out: "mapped" });
  });

  it("should respect maxIterations and stop on circular dependencies", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "math",
        title: "Add",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: { math: { operation: "add", operand: 1 } },
      },
    ];

    const edges: Edge[] = [
      {
        id: "e1",
        from: "node-1",
        to: "node-1",
        fromPort: "value",
        toPort: "value",
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: { "node-1": { value: 1 } },
    });

    // Max iterations is nodes.length + 2 = 3. 
    // Initial: 1
    // It 1: 1+1 = 2
    // It 2: 2+1 = 3
    // It 3: 3+1 = 4
    expect(result.outputs["node-1"]?.value).toBeLessThan(10); 
    expect(result.outputs["node-1"]?.value).toBeDefined();
  });

  it("should skip nodes provided in skipNodeIds", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Const",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: "string", value: "initial" } },
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      skipNodeIds: ["node-1"],
      seedOutputs: { "node-1": { value: "seeded" } }
    });

    // Should keep the seeded value and not run the handler
    expect(result.outputs["node-1"]?.value).toBe("seeded");
  });

  it("should use cache when hashes match", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Const",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: "string", value: "initial" }, runtime: { cache: { mode: "force" } } },
      },
    ];

    const onNodeStart = vi.fn();

    // First run to get hash
    const result1 = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
    });

    const hash = result1.hashes?.["node-1"];
    expect(hash).toBeDefined();

    // Second run with seed
    const result2 = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      seedOutputs: result1.outputs,
      seedHashes: result1.hashes ?? {},
      onNodeStart,
    });

    expect(onNodeStart).not.toHaveBeenCalled();
    expect(result2.outputs["node-1"]).toEqual(result1.outputs["node-1"]);
  });

  it("should trigger onNodeStart and onNodeFinish callbacks", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Const",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: { constant: { valueType: "string", value: "test" } },
      },
    ];

    const onNodeStart = vi.fn();
    const onNodeFinish = vi.fn();

    await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: [],
      onNodeStart,
      onNodeFinish,
    });

    expect(onNodeStart).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: "node-1" })
    }));
    expect(onNodeFinish).toHaveBeenCalledWith(expect.objectContaining({
      node: expect.objectContaining({ id: "node-1" }),
      nextOutputs: { value: "test" }
    }));
  });
});
