import { vi, beforeEach } from "vitest";
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/products/ai-jobs/route";
import { POST as POST_ENQUEUE } from "@/app/api/products/ai-jobs/enqueue/route";
import { NextRequest } from "next/server";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => (req: any, ctx: any) => {
    const params = ctx?.params instanceof Promise ? ctx.params : Promise.resolve(ctx?.params ?? {});
    return params.then((resolvedParams: any) => handler(req, ctx, resolvedParams));
  },
}));

// Mock jobs server
vi.mock("@/features/jobs/server", () => ({
  getProductAiJobs: vi.fn().mockResolvedValue([]),
  getProductAiJob: vi.fn().mockResolvedValue(null),
  cancelProductAiJob: vi.fn().mockResolvedValue({ id: "job1", status: "cancelled" }),
  deleteProductAiJob: vi.fn().mockResolvedValue(true),
  deleteTerminalProductAiJobs: vi.fn().mockResolvedValue(5),
  deleteAllProductAiJobs: vi.fn().mockResolvedValue(10),
  cleanupStaleRunningProductAiJobs: vi.fn().mockResolvedValue(0),
  startProductAiJobQueue: vi.fn(),
  getQueueStatus: vi.fn().mockReturnValue({ active: 0, waiting: 0 }),
  enqueueProductAiJob: vi.fn().mockResolvedValue({ id: "job1" }),
  processSingleJob: vi.fn().mockResolvedValue(undefined),
}));

// Mock products server
vi.mock("@/features/products/server", () => ({
  parseJsonBody: async (req: any) => {
    try {
      const body = await req.json();
      return { ok: true, data: body };
    } catch (e) {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

describe("Product AI Jobs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/products/ai-jobs", () => {
    it("should return jobs for a given productId", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/products/ai-jobs?productId=prod1")
      );
      expect(res.status).toEqual(200);
    });
  });

  describe("POST /api/products/ai-jobs/enqueue", () => {
    it("should enqueue a new job", async () => {
      const payload = { productId: "prod1", type: "description", config: {} };
      const res = await POST_ENQUEUE(
        new NextRequest("http://localhost/api/products/ai-jobs/enqueue", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toEqual(200);
    });
  });
});