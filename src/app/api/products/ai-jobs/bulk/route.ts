export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductAiJob } from '@/features/jobs/server';
import { startProductAiJobQueue } from '@/features/jobs/server';
import { getProductRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ProductAiJobType } from '@/shared/types/domain/jobs';
import type { ProductWithImages } from '@/shared/types/domain/products';


const bulkJobSchema = z.object({
  type: z.string().trim().min(1),
  config: z.record(z.string(), z.any()).optional(),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, bulkJobSchema, {
    logPrefix: 'products.ai-jobs.bulk.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const { type, config } = parsed.data;

  // Get all product IDs using repository
  const productRepository = await getProductRepository();
  const products = await productRepository.getProducts({
    pageSize: 10000, // Large limit to get all products
    page: 1,
  });

  if (products.length === 0) {
    return NextResponse.json({ message: 'No products found to process', count: 0 });
  }

  // Create jobs in bulk (using a transaction or loop)
  // For now, simple loop using the service
  const jobs = await Promise.all(
    products.map((p: ProductWithImages) =>
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
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'products.ai-jobs.bulk.POST' });
