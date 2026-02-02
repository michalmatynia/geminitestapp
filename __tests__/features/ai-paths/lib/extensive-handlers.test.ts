import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateGraph } from "@/features/ai/ai-paths/lib/core/runtime/engine";
import type { AiNode } from "@/shared/types/ai-paths";
import * as api from "@/features/ai/ai-paths/lib/api";

// Mock the entire API module
vi.mock("@/features/ai/ai-paths/lib/api", () => ({
  dbApi: {
    action: vi.fn(),
    query: vi.fn(),
    schema: vi.fn(),
  },
  entityApi: {
    update: vi.fn(),
    createProduct: vi.fn(),
    createNote: vi.fn(),
    deleteProduct: vi.fn(),
    deleteNote: vi.fn(),
    getByType: vi.fn(),
  },
  aiJobsApi: {
    enqueue: vi.fn(),
    poll: vi.fn(),
  },
  aiGenerationApi: {
    generateDescription: vi.fn(),
    updateProductDescription: vi.fn(),
  },
}));

describe("AI Paths Extensive Handlers", () => {
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

  describe("handleCompare", () => {
    it("should handle various comparison operators", async () => {
      const operators = [
        { op: "eq", val: "hello", target: "hello", expected: true },
        { op: "eq", val: "hello", target: "world", expected: false },
        { op: "neq", val: "hello", target: "world", expected: true },
        { op: "contains", val: "hello world", target: "world", expected: true },
        { op: "startsWith", val: "hello world", target: "hello", expected: true },
        { op: "endsWith", val: "hello world", target: "world", expected: true },
        { op: "gt", val: 10, target: "5", expected: true },
        { op: "lt", val: 3, target: "5", expected: true },
        { op: "isEmpty", val: "", target: "", expected: true },
        { op: "notEmpty", val: "content", target: "", expected: true },
      ];

      for (const test of operators) {
        const nodes: AiNode[] = [
          {
            id: "node-compare",
            type: "compare",
            title: "Compare",
            description: "",
            inputs: ["value"],
            outputs: ["value", "valid", "errors"],
            position: { x: 0, y: 0 },
            config: {
              compare: {
                operator: test.op as any,
                compareTo: test.target,
                message: "Fail",
              },
            },
          },
        ];

        const result = await evaluateGraph({
          ...defaultOptions,
          nodes,
          seedOutputs: { "trigger": { value: test.val } },
          edges: [{ id: "e1", from: "trigger", to: "node-compare", fromPort: "value", toPort: "value" }] as any,
        });

        expect(result.outputs["node-compare"]?.valid).toBe(test.expected);
      }
    });
  });

  describe("handleGate", () => {
    it("should block when valid is false and mode is block", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-gate",
          type: "gate",
          title: "Gate",
          description: "",
          inputs: ["context", "valid", "errors"],
          outputs: ["context", "valid", "errors"],
          position: { x: 0, y: 0 },
          config: {
            gate: { mode: "block", failMessage: "Blocked!" },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [
          { id: "e1", from: "seed", to: "node-gate", fromPort: "context", toPort: "context" },
          { id: "e2", from: "seed", to: "node-gate", fromPort: "valid", toPort: "valid" },
        ],
        seedOutputs: {
          seed: { context: { foo: "bar" }, valid: false }
        }
      });

      expect(result.outputs["node-gate"]).toEqual({
        context: null,
        valid: false,
        errors: ["Blocked!"],
      });
    });

    it("should pass when valid is true", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-gate",
          type: "gate",
          title: "Gate",
          description: "",
          inputs: ["context", "valid", "errors"],
          outputs: ["context", "valid", "errors"],
          position: { x: 0, y: 0 },
          config: {
            gate: { mode: "block", failMessage: "Blocked!" },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [
          { id: "e1", from: "seed", to: "node-gate", fromPort: "context", toPort: "context" },
          { id: "e2", from: "seed", to: "node-gate", fromPort: "valid", toPort: "valid" },
        ],
        seedOutputs: {
          seed: { context: { foo: "bar" }, valid: true }
        }
      });

      expect(result.outputs["node-gate"]).toMatchObject({
        context: { foo: "bar" },
        valid: true,
      });
    });
  });

  describe("handleParser", () => {
    it("should extract values using JSONPath-like mappings", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-parser",
          type: "parser",
          title: "Parser",
          description: "",
          inputs: ["entityJson"],
          outputs: ["product_name", "price"],
          position: { x: 0, y: 0 },
          config: {
            parser: {
              mappings: {
                product_name: "$.details.name",
                price: "$.priceInfo.amount",
              },
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-parser", fromPort: "entityJson", toPort: "entityJson" }],
        seedOutputs: {
          seed: {
            entityJson: {
              details: { name: "Gadget" },
              priceInfo: { amount: 29.99 }
            }
          }
        }
      });

      expect(result.outputs["node-parser"]).toEqual({
        product_name: "Gadget",
        price: 29.99,
      });
    });

    it("should use fallbacks for common fields", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-parser",
          type: "parser",
          title: "Parser",
          description: "",
          inputs: ["entityJson"],
          outputs: ["title"],
          position: { x: 0, y: 0 },
          config: {
            parser: { mappings: { title: "" } }, // empty mapping triggers fallback
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-parser", fromPort: "entityJson", toPort: "entityJson" }],
        seedOutputs: {
          seed: {
            entityJson: { name: "Fallback Name" }
          }
        }
      });

      expect(result.outputs["node-parser"]).toEqual({
        title: "Fallback Name",
      });
    });

    it("should support bundle output mode", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-parser",
          type: "parser",
          title: "Parser",
          description: "",
          inputs: ["entityJson"],
          outputs: ["name", "bundle"],
          position: { x: 0, y: 0 },
          config: {
            parser: {
              outputMode: "bundle",
              mappings: { name: "$.details.name" },
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-parser", fromPort: "entityJson", toPort: "entityJson" }],
        seedOutputs: {
          seed: {
            entityJson: { details: { name: "Gadget" }, other: "stuff" }
          }
        }
      });

      expect(result.outputs["node-parser"]).toEqual({
        name: "Gadget",
        bundle: { name: "Gadget" },
      });
    });
  });

  describe("handleMapper", () => {
    it("should map values from context", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-mapper",
          type: "mapper",
          title: "Mapper",
          description: "",
          inputs: ["context"],
          outputs: ["out1", "out2"],
          position: { x: 0, y: 0 },
          config: {
            mapper: {
              outputs: ["out1", "out2"],
              mappings: {
                out1: "$.user.name",
                out2: "$.app.version",
              },
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-mapper", fromPort: "context", toPort: "context" }],
        seedOutputs: {
          seed: {
            context: {
              user: { name: "Alice" },
              app: { version: "1.0.0" }
            }
          }
        }
      });

      expect(result.outputs["node-mapper"]).toEqual({
        out1: "Alice",
        out2: "1.0.0",
      });
    });
  });

  describe("handleMutator", () => {
    it("should update a value in context using a template", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-mutator",
          type: "mutator",
          title: "Mutator",
          description: "",
          inputs: ["context", "new_score"],
          outputs: ["context"],
          position: { x: 0, y: 0 },
          config: {
            mutator: {
              path: "$.user.score",
              valueTemplate: "{{new_score}}",
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [
          { id: "e1", from: "seed", to: "node-mutator", fromPort: "context", toPort: "context" },
          { id: "e2", from: "seed", to: "node-mutator", fromPort: "val", toPort: "new_score" },
        ],
        seedOutputs: {
          seed: {
            context: { user: { score: 10 } },
            val: 20
          }
        }
      });

      expect(result.outputs["node-mutator"]?.context).toMatchObject({
        user: { score: "20" },
      });
    });
  });

  describe("handleValidator", () => {
    it("should validate required paths in context", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-validator",
          type: "validator",
          title: "Validator",
          description: "",
          inputs: ["context"],
          outputs: ["context", "valid", "errors"],
          position: { x: 0, y: 0 },
          config: {
            validator: {
              requiredPaths: ["$.user.email", "$.user.id"],
              mode: "all",
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-validator", fromPort: "context", toPort: "context" }],
        seedOutputs: {
          seed: {
            context: { user: { id: "123" } } // missing email
          }
        }
      });

      expect(result.outputs["node-validator"]?.valid).toBe(false);
      expect(result.outputs["node-validator"]?.errors).toContain("user.email");
    });
  });

  describe("handleRouter", () => {
    it("should route based on truthy match", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-router",
          type: "router",
          title: "Router",
          description: "",
          inputs: ["value"],
          outputs: ["valid", "errors", "value"],
          position: { x: 0, y: 0 },
          config: {
            router: { mode: "value", matchMode: "truthy", compareTo: "" },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-router", fromPort: "value", toPort: "value" }],
        seedOutputs: { seed: { value: "has content" } }
      });

      expect(result.outputs["node-router"]).toMatchObject({
        valid: true,
        value: "has content",
      });
    });

    it("should route based on equals match", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-router",
          type: "router",
          title: "Router",
          description: "",
          inputs: ["value"],
          outputs: ["valid", "errors", "value"],
          position: { x: 0, y: 0 },
          config: {
            router: { mode: "value", matchMode: "equals", compareTo: "secret" },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-router", fromPort: "value", toPort: "value" }],
        seedOutputs: { seed: { value: "secret" } }
      });

      expect(result.outputs["node-router"]?.valid).toBe(true);
    });
  });

  describe("handleTemplate", () => {
    it("should render template with inputs", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-template",
          type: "template",
          title: "Template",
          description: "",
          inputs: ["name", "age"],
          outputs: ["prompt"],
          position: { x: 0, y: 0 },
          config: {
            template: { template: "Hello {{name}}, you are {{age}}." },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [
          { id: "e1", from: "seed", to: "node-template", fromPort: "name", toPort: "name" },
          { id: "e2", from: "seed", to: "node-template", fromPort: "age", toPort: "age" },
        ],
        seedOutputs: { seed: { name: "Bob", age: 40 } }
      });

      expect(result.outputs["node-template"]).toEqual({
        prompt: "Hello Bob, you are 40.",
      });
    });
  });

  describe("handleHttp", () => {
    it("should perform fetch and return results", async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => await Promise.resolve(mockResponse.data),
      }));

      const nodes: AiNode[] = [
        {
          id: "node-http",
          type: "http",
          title: "HTTP",
          description: "",
          inputs: ["value"],
          outputs: ["value", "bundle"],
          position: { x: 0, y: 0 },
          config: {
            http: {
              url: "https://api.example.com/test",
              method: "GET",
              headers: "{}",
              responseMode: "json",
              bodyTemplate: "",
              responsePath: "$",
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
      });

      expect(result.outputs["node-http"]).toMatchObject({
        value: { success: true },
        bundle: { ok: true, status: 200 },
      });

      vi.unstubAllGlobals();
    });
  });

  describe("handleDatabase", () => {
    it("should handle query operation", async () => {
      const mockData = { items: [{ id: "1", name: "P1" }], count: 1 };
      (api.dbApi.query as any).mockResolvedValue({ ok: true, data: mockData });

      const nodes: AiNode[] = [
        {
          id: "node-db",
          type: "database",
          title: "DB Query",
          description: "",
          inputs: ["value"],
          outputs: ["result", "bundle"],
          position: { x: 0, y: 0 },
          config: {
            database: {
              operation: "query",
              query: {
                provider: "auto",
                mode: "preset",
                preset: "by_productId",
                collection: "products",
                field: "id",
                idType: "string",
                queryTemplate: "{}",
                limit: 10,
                sort: "{}",
                projection: "{}",
                single: false,
              },
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-db", fromPort: "id", toPort: "value" }],
        seedOutputs: { seed: { id: "p123" } }
      });

      expect(result.outputs["node-db"]?.result).toEqual(mockData.items);
      expect(api.dbApi.query).toHaveBeenCalledWith(expect.objectContaining({
        query: { productId: "p123" },
        collection: "products",
      }));
    });
  });

  describe("handleModel", () => {
    it("should enqueue AI job", async () => {
      (api.aiJobsApi.enqueue as any).mockResolvedValue({ ok: true, data: { jobId: "job-123" } });

      const nodes: AiNode[] = [
        {
          id: "node-model",
          type: "model",
          title: "AI Model",
          description: "",
          inputs: ["prompt"],
          outputs: ["result", "jobId", "status"],
          position: { x: 0, y: 0 },
          config: {
            model: {
              modelId: "gpt-4o",
              waitForResult: false,
              temperature: 0.7,
              maxTokens: 1000,
              vision: false,
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "seed", to: "node-model", fromPort: "text", toPort: "prompt" }],
        seedOutputs: { seed: { text: "Tell me a joke" } }
      });

      expect(result.outputs["node-model"]).toMatchObject({
        jobId: "job-123",
        status: "queued",
      });
      expect(api.aiJobsApi.enqueue).toHaveBeenCalled();
    });
  });

  describe("handleMath", () => {
    it("should perform arithmetic operations", async () => {
      const ops = [
        { op: "add", val: 10, operand: 5, expected: 15 },
        { op: "subtract", val: 10, operand: 5, expected: 5 },
        { op: "multiply", val: 10, operand: 5, expected: 50 },
        { op: "divide", val: 10, operand: 5, expected: 2 },
        { op: "round", val: 10.6, operand: 0, expected: 11 },
        { op: "floor", val: 10.6, operand: 0, expected: 10 },
        { op: "ceil", val: 10.1, operand: 0, expected: 11 },
      ];

      for (const test of ops) {
        const nodes: AiNode[] = [
          {
            id: "node-math",
            type: "math",
            title: "Math",
            description: "",
            inputs: ["value"],
            outputs: ["value"],
            position: { x: 0, y: 0 },
            config: {
              math: { operation: test.op as any, operand: test.operand },
            },
          },
        ];

        const result = await evaluateGraph({
          ...defaultOptions,
          nodes,
          edges: [{ id: "e1", from: "seed", to: "node-math", fromPort: "v", toPort: "value" }],
          seedOutputs: { seed: { v: test.val } }
        });

        expect(result.outputs["node-math"]?.value).toBe(test.expected);
      }
    });
  });

  describe("handleConstant", () => {
    it("should return constant values of different types", async () => {
      const types = [
        { type: "string", val: "hello", expected: "hello" },
        { type: "number", val: "123", expected: 123 },
        { type: "boolean", val: "true", expected: true },
        { type: "json", val: '{"a":1}', expected: { a: 1 } },
      ];

      for (const test of types) {
        const nodes: AiNode[] = [
          {
            id: "node-const",
            type: "constant",
            title: "Const",
            description: "",
            inputs: [],
            outputs: ["value"],
            position: { x: 0, y: 0 },
            config: {
              constant: { valueType: test.type as any, value: test.val },
            },
          },
        ];

        const result = await evaluateGraph({
          ...defaultOptions,
          nodes,
          edges: [],
        });

        expect(result.outputs["node-const"]?.value).toEqual(test.expected);
      }
    });
  });

  describe("handleBundle", () => {
    it("should bundle multiple inputs into one object", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-bundle",
          type: "bundle",
          title: "Bundle",
          description: "",
          inputs: ["a", "b", "c"],
          outputs: ["bundle"],
          position: { x: 0, y: 0 },
          config: {
            bundle: { includePorts: ["a", "c"] },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [
          { id: "e1", from: "s", to: "node-bundle", fromPort: "a", toPort: "a" },
          { id: "e2", from: "s", to: "node-bundle", fromPort: "b", toPort: "b" },
          { id: "e3", from: "s", to: "node-bundle", fromPort: "c", toPort: "c" },
        ],
        seedOutputs: { s: { a: 1, b: 2, c: 3 } }
      });

      expect(result.outputs["node-bundle"]?.bundle).toEqual({ a: 1, c: 3 });
    });
  });

  describe("handleTrigger", () => {
    it("should return trigger information", async () => {
      const nodes: AiNode[] = [
        {
          id: "node-trigger",
          type: "trigger",
          title: "Trigger",
          description: "",
          inputs: [],
          outputs: ["trigger", "meta", "context", "entityId", "entityType"],
          position: { x: 0, y: 0 },
          config: {
            trigger: { event: "manual_run" },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
        triggerNodeId: "node-trigger",
        triggerEvent: "test_event",
      });

      expect(result.outputs["node-trigger"]).toMatchObject({
        trigger: "test_event",
        meta: expect.objectContaining({ trigger: "test_event" }),
      });
    });
  });

  describe("handleAiDescription", () => {
    it("should call generateDescription API", async () => {
      (api.aiGenerationApi.generateDescription as any).mockResolvedValue({
        ok: true,
        data: { description: "AI generated description" },
      });

      const nodes: AiNode[] = [
        {
          id: "node-desc",
          type: "ai_description",
          title: "AI Desc",
          description: "",
          inputs: ["entityJson"],
          outputs: ["description_en"],
          position: { x: 0, y: 0 },
          config: {
            description: { visionOutputEnabled: true },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [{ id: "e1", from: "s", to: "node-desc", fromPort: "j", toPort: "entityJson" }],
        seedOutputs: { s: { j: { name: "Product" } } }
      });

      expect(result.outputs["node-desc"]?.description_en).toBe("AI generated description");
      expect(api.aiGenerationApi.generateDescription).toHaveBeenCalled();
    });
  });

  describe("handleDbSchema", () => {
    it("should fetch and format database schema", async () => {
      const mockSchema = {
        provider: "mongodb",
        collections: [
          { name: "products", fields: [{ name: "id", type: "string" }] }
        ]
      };
      (api.dbApi.schema as any).mockResolvedValue({ ok: true, data: mockSchema });

      const nodes: AiNode[] = [
        {
          id: "node-schema",
          type: "db_schema",
          title: "Schema",
          description: "",
          inputs: [],
          outputs: ["schema", "context"],
          position: { x: 0, y: 0 },
          config: {
            db_schema: {
              mode: "all",
              collections: [],
              includeFields: true,
              includeRelations: true,
              formatAs: "text",
            },
          },
        },
      ];

      const result = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
      });

      expect(result.outputs["node-schema"]?.schema).toContain("DATABASE SCHEMA");
      expect(result.outputs["node-schema"]?.schema).toContain("Collection: products");
    });
  });

  describe("Graph Caching", () => {
    it("should not re-execute a node if inputs and config have not changed", async () => {
      const nodes: AiNode[] = [
        {
          id: "n1",
          type: "constant",
          title: "Const",
          description: "",
          inputs: [],
          outputs: ["value"],
          position: { x: 0, y: 0 },
          config: {
            constant: { valueType: "string", value: "initial" },
            runtime: { cache: { mode: "auto" } }
          },
        },
      ];

      // First run
      const result1 = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
      });

      expect(result1.outputs["n1"]).toEqual({ value: "initial" });
      const hash1 = result1.hashes?.["n1"];
      expect(hash1).toBeDefined();

      const onNodeStart = vi.fn();
      await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
        seedOutputs: result1.outputs,
        seedHashes: result1.hashes,
        onNodeStart,
      });

      expect(onNodeStart).not.toHaveBeenCalled(); // Should have been skipped due to cache
    });

    it("should re-execute if cache is disabled", async () => {
      const nodes: AiNode[] = [
        {
          id: "n1",
          type: "constant",
          title: "Const",
          description: "",
          inputs: [],
          outputs: ["value"],
          position: { x: 0, y: 0 },
          config: {
            constant: { valueType: "string", value: "initial" },
            runtime: { cache: { mode: "disabled" } }
          },
        },
      ];

      const onNodeStart = vi.fn();
      
      const result1 = await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
      });

      await evaluateGraph({
        ...defaultOptions,
        nodes,
        edges: [],
        seedOutputs: result1.outputs,
        seedHashes: result1.hashes,
        onNodeStart,
      });

      expect(onNodeStart).toHaveBeenCalled();
    });
  });
});