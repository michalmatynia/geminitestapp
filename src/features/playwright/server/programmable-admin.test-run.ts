import { buildPlaywrightImportInput } from '@/features/integrations/services/playwright-import-service';
import {
  mapPlaywrightImportProducts,
  parsePlaywrightFieldMapperJson,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';

import type { PlaywrightProgrammableTestPayload } from './programmable-admin.schemas';
import { buildDefaultListingSampleInput } from './programmable-admin.shared';
import { requirePlaywrightProgrammableConnectionById } from './programmable-storage';
import {
  runPlaywrightProgrammableImportForConnection,
  runPlaywrightProgrammableListingForConnection,
} from './programmable';

const requireProgrammableTestConnection = async (
  connectionId: string
): Promise<IntegrationConnectionRecord> => {
  const { connection } = await requirePlaywrightProgrammableConnectionById({
    connectionId,
    errorMessage:
      'Only programmable integrations support programmable Playwright test runs.',
  });
  return connection;
};

export const runPlaywrightProgrammableConnectionTest = async ({
  connectionId,
  scriptType,
  sampleInput = {},
}: PlaywrightProgrammableTestPayload): Promise<{
  ok: true;
  scriptType: 'listing' | 'import';
  input: Record<string, unknown>;
  result: unknown;
}> => {
  const connection = await requireProgrammableTestConnection(connectionId);

  if (scriptType === 'listing') {
    const input = {
      ...buildDefaultListingSampleInput(),
      ...sampleInput,
    };

    return {
      ok: true,
      scriptType: 'listing',
      input,
      result: await runPlaywrightProgrammableListingForConnection({
        connection,
        input,
      }),
    };
  }

  const input = {
    ...buildPlaywrightImportInput(connection),
    ...sampleInput,
  };
  const result = await runPlaywrightProgrammableImportForConnection({
    connection,
    input,
  });

  return {
    ok: true,
    scriptType: 'import',
    input,
    result: {
      rawResult: result.rawResult,
      rawProducts: result.products,
      mappedProducts: mapPlaywrightImportProducts(
        result.products,
        parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson)
      ),
    },
  };
};
