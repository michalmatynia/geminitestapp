import { type NextRequest, NextResponse } from 'next/server';

import { resolveMarketplaceCopyDebrandIntegration } from '@/features/products/server/marketplace-copy-debrand-batch';
import { enqueueProductMarketplaceCopyDebrandBatchJob } from '@/features/products/workers/productMarketplaceCopyDebrandBatchQueue';
import {
  productMarketplaceCopyDebrandBatchRequestSchema,
  productMarketplaceCopyDebrandBatchResponseSchema,
  type ProductMarketplaceCopyDebrandBatchRequest,
} from '@/shared/contracts/products/marketplace-copy-debrand-batch';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productMarketplaceCopyDebrandBatchRequestSchema };

const resolveIntegrationName = (integration: {
  id: string;
  name: string;
  slug: string;
}): string => {
  const name = integration.name.trim();
  if (name.length > 0) return name;
  const slug = integration.slug.trim();
  return slug.length > 0 ? slug : integration.id;
};

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductMarketplaceCopyDebrandBatchRequest;
  const productIds = Array.from(new Set(body.productIds.map((id) => id.trim()).filter(Boolean)));
  const integration = await resolveMarketplaceCopyDebrandIntegration(body.integrationId);
  const jobId = await enqueueProductMarketplaceCopyDebrandBatchJob({
    productIds,
    integrationId: integration.id,
    userId: ctx.userId ?? null,
    requestedAt: new Date().toISOString(),
  });

  return NextResponse.json(
    productMarketplaceCopyDebrandBatchResponseSchema.parse({
      status: 'queued',
      jobId,
      requested: productIds.length,
      integrationId: integration.id,
      integrationSlug: integration.slug,
      integrationName: resolveIntegrationName(integration),
    })
  );
}
