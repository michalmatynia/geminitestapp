import 'server-only';

import type { IntegrationConnectionRecord, IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import {
  buildPlaywrightImportInput,
  parsePlaywrightImportCaptureConfigJson,
} from '@/features/playwright/server/import-input';

import {
  mapPlaywrightImportProducts,
  parsePlaywrightFieldMapperJson,
  type PlaywrightMappedImportProduct,
} from './playwright-listing/field-mapper';
import { runPlaywrightProgrammableImportForConnection } from '@/features/playwright/server';
export { buildPlaywrightImportInput, parsePlaywrightImportCaptureConfigJson };

export const runPlaywrightImport = async ({
  connection,
  integration,
}: {
  connection: IntegrationConnectionRecord;
  integration?: IntegrationRecord | null;
}): Promise<{
  rawProducts: Array<Record<string, unknown>>;
  mappedProducts: PlaywrightMappedImportProduct[];
  rawResult: Record<string, unknown>;
}> => {
  if (integration && integration.slug.trim().toLowerCase() !== 'playwright-programmable') {
    throw new Error(
      `Integration ${integration.slug} does not support programmable Playwright imports.`
    );
  }

  const result = await runPlaywrightProgrammableImportForConnection({
    connection,
    input: buildPlaywrightImportInput(connection),
  });

  const fieldMappings = parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson);

  return {
    rawProducts: result.products,
    mappedProducts: mapPlaywrightImportProducts(result.products, fieldMappings),
    rawResult: result.rawResult,
  };
};
