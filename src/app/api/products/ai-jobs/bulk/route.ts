import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueueProductAiJob } from "@/features/jobs/services/productAiService";
import type { ProductAiJobType } from "@/shared/types/jobs";
import { startProductAiJobQueue } from "@/features/jobs/workers/productAiQueue";
import { getProductRepository } from "@/features/products/services/product-repository";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { apiHandler } from "@/shared/lib/api/api-handler";

const bulkJobSchema = z.object({
  type: z.string().trim().min(1),
  config: z.unknown().optional(),
});

async function POST_handler(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, bulkJobSchema, {
      logPrefix: "products.ai-jobs.bulk.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { type, config } = parsed.data;

    // Get all product IDs using repository
    const productRepository = await getProductRepository();
    const products = await productRepository.getProducts({
      pageSize: "10000", // Large limit to get all products
      page: "1",
    });

    if (products.length === 0) {
      return NextResponse.json({ message: "No products found to process", count: 0 });
    }

    // Create jobs in bulk (using a transaction or loop)
    // For now, simple loop using the service
    const jobs = await Promise.all(
      products.map((p) =>
        enqueueProductAiJob(p.id, type as ProductAiJobType, {
          ...(config as Record<string, unknown>),
          // We don't include full product data here, 
          // the worker will fetch it to ensure it's fresh
        })
      )
    );

    startProductAiJobQueue();

    return NextResponse.json({ 
      success: true, 
      count: jobs.length,
      message: `Queued ${jobs.length} jobs of type ${type}` 
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.ai-jobs.bulk.POST",
      fallbackMessage: "Failed to queue bulk jobs",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "products.ai-jobs.bulk.POST" });
