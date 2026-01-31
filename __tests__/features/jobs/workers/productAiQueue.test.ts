import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pollQueue, resetProductAiJobQueue } from "@/features/jobs/workers/productAiQueue";
import { getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import { generateProductDescription, translateProduct, getProductRepository } from "@/features/products/server";
import { ErrorSystem } from "@/features/observability/server";

vi.mock("@/features/jobs/services/product-ai-job-repository", () => ({
  getProductAiJobRepository: vi.fn(),
}));

vi.mock("@/features/products/server", () => ({
  generateProductDescription: vi.fn(),
  translateProduct: vi.fn(),
  getProductRepository: vi.fn(),
  getSettingValue: vi.fn().mockResolvedValue("mock-value"),
}));

vi.mock("@/features/observability/server", () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

vi.mock("@/features/internationalization/services/internationalization-provider", () => ({
  getInternationalizationProvider: vi.fn().mockResolvedValue("prisma"),
}));

describe("Product AI Job Queue Worker", () => {
  const mockJobRepo = {
    markStaleRunningJobs: vi.fn().mockResolvedValue({ count: 0 }),
    claimNextPendingJob: vi.fn(),
    findAnyPendingJob: vi.fn().mockResolvedValue(null),
    updateJob: vi.fn(),
  };

  const mockProductRepo = {
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetProductAiJobQueue();
    vi.mocked(getProductAiJobRepository).mockResolvedValue(mockJobRepo as any);
    vi.mocked(getProductRepository).mockResolvedValue(mockProductRepo as any);
  });

  describe("pollQueue", () => {
    it("processes a description generation job", async () => {
      const mockJob = {
        id: "job-1",
        type: "description_generation",
        status: "pending",
        productId: "p1",
        payload: { isTest: false },
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      
      const mockProduct = { id: "p1", name_en: "Product 1", images: [], imageLinks: [] };
      mockProductRepo.getProductById.mockResolvedValue(mockProduct);
      
      vi.mocked(generateProductDescription).mockResolvedValue({ description: "New Description" } as any);

      await pollQueue();

      expect(mockJobRepo.claimNextPendingJob).toHaveBeenCalled();
      expect(generateProductDescription).toHaveBeenCalled();
      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith("p1", { description_en: "New Description" });
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith("job-1", expect.objectContaining({ status: "completed" }));
    });

    it("processes a translation job", async () => {
      const mockJob = {
        id: "job-2",
        type: "translation",
        status: "pending",
        productId: "p2",
        payload: {},
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      
      const mockProduct = { id: "p2", name_en: "Name EN", description_en: "Desc EN", catalogs: [] };
      mockProductRepo.getProductById.mockResolvedValue(mockProduct);
      
      vi.mocked(translateProduct).mockResolvedValue({ 
        translations: { 
          "Polish": { name: "Name PL", description: "Desc PL" } 
        } 
      } as any);

      await pollQueue();

      expect(translateProduct).toHaveBeenCalled();
      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith("p2", expect.objectContaining({ name_pl: "Name PL" }));
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith("job-2", expect.objectContaining({ status: "completed" }));
    });

    it("handles errors and captures exception", async () => {
      const mockJob = {
        id: "job-3",
        type: "description_generation",
        status: "pending",
        productId: "p3",
        payload: {},
        createdAt: new Date(),
      };
      mockJobRepo.claimNextPendingJob.mockResolvedValue(mockJob);
      mockProductRepo.getProductById.mockRejectedValue(new Error("DB Error"));

      await pollQueue();

      expect(ErrorSystem.captureException).toHaveBeenCalled();
      expect(mockJobRepo.updateJob).toHaveBeenCalledWith("job-3", expect.objectContaining({ 
        status: "failed",
        errorMessage: "DB Error"
      }));
    });
  });
});