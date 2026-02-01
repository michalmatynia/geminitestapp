import { describe, it, expect, vi } from "vitest";
import { evaluateGraph } from "@/features/ai-paths/lib/core/runtime/engine";
import type { AiNode, Edge } from "@/shared/types/ai-paths";

describe("evaluateGraph", () => {
  const mockFetchEntityByType = vi.fn();
  const mockReportAiPathsError = vi.fn();
  const mockToast = vi.fn();

  const defaultOptions = {
    activePathId: "test-path",
    fetchEntityByType: mockFetchEntityByType,
    reportAiPathsError: mockReportAiPathsError,
    toast: mockToast,
  };

  it("should evaluate a simple constant node", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Constant",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: "string",
            value: "hello",
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["node-1"]).toEqual({ value: "hello" });
  });

  it("should evaluate constant + math nodes", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Constant",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: {
          constant: {
            valueType: "number",
            value: "10",
          },
        },
      },
      {
        id: "node-2",
        type: "math",
        title: "Math",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 200, y: 0 },
        config: {
          math: {
            operation: "add",
            operand: 5,
          },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: "edge-1",
        from: "node-1",
        to: "node-2",
        fromPort: "value",
        toPort: "value",
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["node-1"]).toEqual({ value: 10 });
    expect(result.outputs["node-2"]).toEqual({ value: 15 });
  });

  it("should handle branching logic with router", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-1",
        type: "constant",
        title: "Value",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: {
          constant: { valueType: "number", value: "100" },
        },
      },
      {
        id: "node-router",
        type: "router",
        title: "Router",
        description: "",
        inputs: ["value"],
        outputs: ["valid", "errors", "value"],
        position: { x: 200, y: 0 },
        config: {
          router: {
            mode: "value",
            matchMode: "equals",
            compareTo: "100",
          },
        },
      },
      {
        id: "node-success",
        type: "template",
        title: "Success",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 400, y: -100 },
        config: {
          template: { template: "Success: {{value}}" },
        },
      },
    ];
    const edges: Edge[] = [
      {
        id: "e1",
        from: "node-1",
        to: "node-router",
        fromPort: "value",
        toPort: "value",
      },
      {
        id: "e2",
        from: "node-router",
        to: "node-success",
        fromPort: "value",
        toPort: "value",
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["node-router"]).toMatchObject({ valid: true });
    expect(result.outputs["node-success"]).toEqual({ prompt: "Success: 100" });
  });

  it("should evaluate a parser node with JSON input", async () => {
    const nodes: AiNode[] = [
      {
        id: "node-parser",
        type: "parser",
        title: "Parser",
        description: "",
        inputs: ["entityJson"],
        outputs: ["title", "price"],
        position: { x: 0, y: 0 },
        config: {
          parser: {
            mappings: {
              title: "$.name",
              price: "$.details.price",
            },
          },
        },
      },
    ];
    const seedOutputs = {
      "trigger-node": {
        entityJson: {
          name: "Test Product",
          details: { price: 99.99 },
        },
      },
    };
    const edgesWithSeed: Edge[] = [
      {
        id: "e-seed",
        from: "trigger-node",
        to: "node-parser",
        fromPort: "entityJson",
        toPort: "entityJson",
      },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges: edgesWithSeed,
      seedOutputs,
    });

    expect(result.outputs["node-parser"]).toEqual({
      title: "Test Product",
      price: 99.99,
    });
  });

  it("should handle context node resolution", async () => {
    const mockProduct = { id: "p1", title: "Original Title" };
    mockFetchEntityByType.mockResolvedValue(mockProduct);

    const nodes: AiNode[] = [
      {
        id: "node-context",
        type: "context",
        title: "Context",
        description: "",
        inputs: [],
        outputs: ["context", "entityId", "entityType", "entityJson"],
        position: { x: 0, y: 0 },
        config: {
          context: {
            role: "product",
            entityType: "product",
            entityIdSource: "manual",
            entityId: "p1",
          },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["node-context"]).toMatchObject({
      entityId: "p1",
      entityType: "product",
      entityJson: mockProduct,
    });
    expect(mockFetchEntityByType).toHaveBeenCalledWith("product", "p1");
  });

  it("should handle complex graph with multiple iterations", async () => {
    // node-1 (const 5) -> node-2 (math +1) -> node-3 (math +1) -> node-4 (math +1)
    const nodes: AiNode[] = [
      {
        id: "n1",
        type: "constant",
        title: "Start",
        description: "",
        inputs: [],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: {
          constant: { valueType: "number", value: "5" },
        },
      },
      {
        id: "n2",
        type: "math",
        title: "Add 1",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 200, y: 0 },
        config: {
          math: { operation: "add", operand: 1 },
        },
      },
      {
        id: "n3",
        type: "math",
        title: "Add 1",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 400, y: 0 },
        config: {
          math: { operation: "add", operand: 1 },
        },
      },
      {
        id: "n4",
        type: "math",
        title: "Add 1",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 600, y: 0 },
        config: {
          math: { operation: "add", operand: 1 },
        },
      },
    ];
    const edges: Edge[] = [
      { id: "e1", from: "n1", to: "n2", fromPort: "value", toPort: "value" },
      { id: "e2", from: "n2", to: "n3", fromPort: "value", toPort: "value" },
      { id: "e3", from: "n3", to: "n4", fromPort: "value", toPort: "value" },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
    });

    expect(result.outputs["n4"]).toEqual({ value: 8 });
  });

  it("should stop if max iterations reached in a loop", async () => {
    // n1 (math +1) -> n1 (loop back)
    // evaluateGraph uses maxIterations = Math.max(2, nodes.length + 2)
    // For 1 node, maxIterations = 3.
    const nodes: AiNode[] = [
      {
        id: "n1",
        type: "math",
        title: "Counter",
        description: "",
        inputs: ["value"],
        outputs: ["value"],
        position: { x: 0, y: 0 },
        config: {
          math: { operation: "add", operand: 1 },
        },
      },
    ];
    const edges: Edge[] = [
      { id: "e1", from: "n1", to: "n1", fromPort: "value", toPort: "value" },
    ];

    const result = await evaluateGraph({
      ...defaultOptions,
      nodes,
      edges,
      seedOutputs: { n1: { value: 0 } },
    });

    // Iteration 0: outputs[n1].value=0 (seed)
    // Iteration 1: inputs[n1].value=0, outputs[n1].value=1
    // Iteration 2: inputs[n1].value=1, outputs[n1].value=2
    // Iteration 3: inputs[n1].value=2, outputs[n1].value=3
    // It should stop at 3 or 4 depending on loop logic.
    expect(result.outputs["n1"]!.value).toBeGreaterThanOrEqual(2);
    expect(result.outputs["n1"]!.value).toBeLessThanOrEqual(4);
  });
});
