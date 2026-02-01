import { vi, beforeEach, afterAll } from "vitest";
import { describe, it, expect } from "vitest";
import { GET, DELETE } from "@/app/api/products/ai-jobs/route";
import { POST as POST_ENQUEUE } from "@/app/api/products/ai-jobs/enqueue/route";
import { POST as POST_BULK } from "@/app/api/products/ai-jobs/bulk/route";
import { GET as GET_BY_ID, POST as POST_BY_ID, DELETE as DELETE_BY_ID } from "@/app/api/products/ai-jobs/[jobId]/route";
import { NextRequest } from "next/server";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
  apiHandlerWithParams: (handler: any) => (req: any, ctx: any) => {
    // Correctly resolve params if it's a promise
    const params = ctx?.params instanceof Promise ? ctx.params : Promise.resolve(ctx?.params ?? {});
    return params.then(resolvedParams => handler(req, ctx, resolvedParams));
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
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return { ok: false, response: new Response(JSON.stringify(result.error), { status: 400 }) };
      }
      return { ok: true, data: result.data };
    } catch (e) {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
  getProductRepository: vi.fn().mockResolvedValue({
    getProducts: vi.fn().mockResolvedValue([{ id: "prod1" }, { id: "prod2" }]),
  }),
}));

import { 
  getProductAiJobs, 
  deleteTerminalProductAiJobs, 
  deleteAllProductAiJobs, 
  getQueueStatus, 
  enqueueProductAiJob, 
  getProductAiJob,
  cancelProductAiJob,
  deleteProductAiJob
} from "@/features/jobs/server";

describe("Product AI Jobs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/products/ai-jobs", () => {
    it("should return jobs for a given productId", async () => {
      const mockJobs = [{ id: "job1", type: "description", status: "completed" }];
      vi.mocked(getProductAiJobs).mockResolvedValue(mockJobs as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/ai-jobs?productId=prod1"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.jobs).toHaveLength(1);
      expect(getProductAiJobs).toHaveBeenCalledWith("prod1");
    });

    it("should return queue status if status=true", async () => {
      vi.mocked(getQueueStatus).mockReturnValue({ active: 2, waiting: 5 } as any);

      const res = await GET(
        new NextRequest("http://localhost/api/products/ai-jobs?status=true"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.status).toEqual({ active: 2, waiting: 5 });
    });
  });

  describe("POST /api/products/ai-jobs/enqueue", () => {
    it("should enqueue a new job", async () => {
      const payload = { productId: "prod1", type: "description", payload: { lang: "en" } };
      const res = await POST_ENQUEUE(
        new NextRequest("http://localhost/api/products/ai-jobs/enqueue", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.success).toBe(true);
      expect(enqueueProductAiJob).toHaveBeenCalledWith("prod1", "description", { lang: "en" });
    });
  });

  describe("POST /api/products/ai-jobs/bulk", () => {
    it("should enqueue bulk jobs for all products", async () => {
      const payload = { type: "description", config: { lang: "en" } };
      const res = await POST_BULK(
        new NextRequest("http://localhost/api/products/ai-jobs/bulk", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.success).toBe(true);
      expect(data.count).toEqual(2);
      expect(enqueueProductAiJob).toHaveBeenCalledTimes(2);
    });
  });

  describe("GET /api/products/ai-jobs/[jobId]", () => {
    it("should return a job by ID", async () => {
      const mockJob = { id: "job123", status: "running" };
      vi.mocked(getProductAiJob).mockResolvedValue(mockJob as any);

      const res = await GET_BY_ID(
        new NextRequest("http://localhost/api/products/ai-jobs/job123"),
        { params: Promise.resolve({ jobId: "job123" }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.job.id).toEqual("job123");
    });

    it("should return 404 if job not found", async () => {
      vi.mocked(getProductAiJob).mockResolvedValue(null);

      const res = await GET_BY_ID(
        new NextRequest("http://localhost/api/products/ai-jobs/non-existent"),
        { params: Promise.resolve({ jobId: "non-existent" }) } as any
      );
      expect(res.status).toEqual(404);
    });
  });

  describe("POST /api/products/ai-jobs/[jobId]", () => {
    it("should cancel a job", async () => {
      const res = await POST_BY_ID(
        new NextRequest("http://localhost/api/products/ai-jobs/job123", {
          method: "POST",
          body: JSON.stringify({ action: "cancel" }),
        }),
        { params: Promise.resolve({ jobId: "job123" }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.success).toBe(true);
      expect(cancelProductAiJob).toHaveBeenCalledWith("job123");
    });

    it("should return 400 for invalid action", async () => {
      const res = await POST_BY_ID(
        new NextRequest("http://localhost/api/products/ai-jobs/job123", {
          method: "POST",
          body: JSON.stringify({ action: "invalid" }),
        }),
        { params: Promise.resolve({ jobId: "job123" }) } as any
      );
      expect(res.status).toEqual(400);
    });
  });

  describe("DELETE /api/products/ai-jobs/[jobId]", () => {
    it("should delete a job", async () => {
      const res = await DELETE_BY_ID(
        new NextRequest("http://localhost/api/products/ai-jobs/job123", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ jobId: "job123" }) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.success).toBe(true);
      expect(deleteProductAiJob).toHaveBeenCalledWith("job123");
    });
  });

  describe("DELETE /api/products/ai-jobs", () => {
    it("should delete terminal jobs when scope=terminal", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/products/ai-jobs?scope=terminal"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.count).toEqual(5);
      expect(deleteTerminalProductAiJobs).toHaveBeenCalled();
    });

    it("should delete all jobs when scope=all", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/products/ai-jobs?scope=all"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data.count).toEqual(10);
      expect(deleteAllProductAiJobs).toHaveBeenCalled();
    });
  });
});