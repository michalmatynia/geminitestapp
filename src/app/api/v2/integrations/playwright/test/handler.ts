import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isPlaywrightProgrammableSlug } from '@/features/integrations/constants/slugs';
import { getIntegrationRepository } from '@/features/integrations/server';
import {
  mapPlaywrightImportProducts,
  parsePlaywrightFieldMapperJson,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import {
  runPlaywrightProgrammableImportForConnection,
  runPlaywrightProgrammableListingForConnection,
} from '@/features/playwright/server';
import { buildPlaywrightImportInput } from '@/features/integrations/services/playwright-import-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const playwrightTestPayloadSchema = z.object({
  connectionId: z.string().trim().min(1),
  scriptType: z.enum(['listing', 'import']),
  sampleInput: z.record(z.string(), z.unknown()).optional(),
});

const buildDefaultListingSampleInput = (): Record<string, unknown> => {
  const product = {
    id: 'sample-product',
    sku: 'PW-SAMPLE-001',
    name: { en: 'Programmable Playwright Sample Product' },
    description: { en: 'Sample payload for testing a programmable marketplace listing script.' },
    price: 49.99,
    images: [
      'https://images.example.com/products/playwright-sample-1.jpg',
      'https://images.example.com/products/playwright-sample-2.jpg',
    ],
  };

  return {
    title: 'Programmable Playwright Sample Product',
    description: 'Sample payload for testing a programmable marketplace listing script.',
    price: 49.99,
    images: product.images,
    imageUrls: product.images,
    sku: product.sku,
    bundle: product,
    product,
    entityJson: JSON.stringify(product),
  };
};

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, playwrightTestPayloadSchema, {
    logPrefix: 'integrations.playwright.test.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(parsed.data.connectionId);
  if (!connection) {
    throw notFoundError('Connection not found', { connectionId: parsed.data.connectionId });
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found', { integrationId: connection.integrationId });
  }

  if (!isPlaywrightProgrammableSlug(integration.slug)) {
    throw badRequestError(
      `Integration ${integration.slug} does not support programmable Playwright test runs.`
    );
  }

  const sampleInput = parsed.data.sampleInput ?? {};

  if (parsed.data.scriptType === 'listing') {
    const input = {
      ...buildDefaultListingSampleInput(),
      ...sampleInput,
    };
    const result = await runPlaywrightProgrammableListingForConnection({
      connection,
      input,
    });

    return NextResponse.json({
      ok: true,
      scriptType: 'listing',
      input,
      result,
    });
  }

  const input = {
    ...buildPlaywrightImportInput(connection),
    ...sampleInput,
  };
  const result = await runPlaywrightProgrammableImportForConnection({
    connection,
    input,
  });
  const fieldMappings = parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson);

  return NextResponse.json({
    ok: true,
    scriptType: 'import',
    input,
    result: {
      rawResult: result.rawResult,
      rawProducts: result.products,
      mappedProducts: mapPlaywrightImportProducts(result.products, fieldMappings),
    },
  });
}
