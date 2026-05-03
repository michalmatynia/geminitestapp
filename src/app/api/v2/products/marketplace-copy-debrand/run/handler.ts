import { type NextRequest, NextResponse } from 'next/server';

import { enqueueMarketplaceCopyDebrandRowRun } from '@/features/products/server/marketplace-copy-debrand-ai-path';
import {
  resolveMarketplaceCopyDebrandIntegration,
  resolveMarketplaceCopyDebrandIntegrationName,
} from '@/features/products/server/marketplace-copy-debrand-batch';
import {
  productMarketplaceCopyDebrandRunRequestSchema,
  productMarketplaceCopyDebrandRunResponseSchema,
  type MarketplaceCopyDebrandTriggerInput,
  type ProductMarketplaceCopyDebrandRunRequest,
} from '@/shared/contracts/products/marketplace-copy-debrand-run';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productMarketplaceCopyDebrandRunRequestSchema };

const uniqueTrimmedValues = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value: string): string => value.trim())
        .filter((value: string): boolean => value.length > 0)
    )
  );

const normalizeProductId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveRowMarketplaceCopyDebrandInput = async (
  input: MarketplaceCopyDebrandTriggerInput
): Promise<{
  integration: Awaited<ReturnType<typeof resolveMarketplaceCopyDebrandIntegration>>;
  marketplaceCopyDebrandInput: MarketplaceCopyDebrandTriggerInput;
}> => {
  const integrationIds = uniqueTrimmedValues(input.targetRow.integrationIds);
  const integrations = await Promise.all(
    integrationIds.map((integrationId: string) =>
      resolveMarketplaceCopyDebrandIntegration(integrationId)
    )
  );
  const primaryIntegration = integrations[0];
  if (!primaryIntegration) {
    throw new Error('Marketplace integration is required.');
  }

  const integrationNameById = new Map(
    integrations.map((integration) => [
      integration.id,
      resolveMarketplaceCopyDebrandIntegrationName(integration),
    ])
  );

  return {
    integration: primaryIntegration,
    marketplaceCopyDebrandInput: {
      ...input,
      targetRow: {
        ...input.targetRow,
        integrationIds,
        integrationNames: integrationIds.map(
          (integrationId: string): string => integrationNameById.get(integrationId) ?? integrationId
        ),
      },
    },
  };
};

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductMarketplaceCopyDebrandRunRequest;
  const { integration, marketplaceCopyDebrandInput } =
    await resolveRowMarketplaceCopyDebrandInput(body.marketplaceCopyDebrandInput);
  const productId = normalizeProductId(body.productId);
  const runId = await enqueueMarketplaceCopyDebrandRowRun({
    productId,
    entityJson: body.entityJson,
    marketplaceCopyDebrandInput,
    integration,
    userId: ctx.userId ?? null,
  });

  return NextResponse.json(
    productMarketplaceCopyDebrandRunResponseSchema.parse({
      status: 'queued',
      runId,
      productId,
    })
  );
}
