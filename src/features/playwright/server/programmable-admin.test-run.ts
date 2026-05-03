import {
  mapPlaywrightImportProducts,
  parsePlaywrightFieldMapperJson,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';

import { runPlaywrightImportAutomationFlow } from './automation-flow';
import type { PlaywrightProgrammableTestPayload } from './programmable-admin.schemas';
import { buildDefaultListingSampleInput } from './programmable-admin.shared';
import { buildPlaywrightImportInput } from './import-input';
import { resolvePlaywrightProgrammableImportSource } from './programmable-import-source';
import { requirePlaywrightProgrammableConnectionById } from './programmable-storage';
import {
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
  executionMode = 'dry_run',
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
  const mappedProductsFromResult = ({
    scrapedItems,
  }: {
    scrapedItems: Array<Record<string, unknown>>;
  }) =>
    mapPlaywrightImportProducts(
      scrapedItems,
      parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson)
    );

  const automationFlowJson = connection.playwrightImportAutomationFlowJson?.trim() ?? '';
  if (automationFlowJson.length > 0) {
    const dryRun = executionMode !== 'commit';
    const automationFlow = await runPlaywrightImportAutomationFlow({
      connection,
      input,
      flow: JSON.parse(automationFlowJson) as unknown,
      dryRun,
    });

    return {
      ok: true,
      scriptType: 'import',
      input,
      result: {
        scrapeSource: automationFlow.scrapeSource,
        rawResult: automationFlow.rawResult,
        scrapedItems: automationFlow.scrapedItems,
        rawProducts: automationFlow.rawProducts,
        mappedProducts: mappedProductsFromResult({
          scrapedItems: automationFlow.scrapedItems,
        }),
        automationFlow: {
          executionMode,
          flow: automationFlow.flow,
          scrapeSource: automationFlow.scrapeSource,
          drafts: automationFlow.drafts,
          draftPayloads: automationFlow.draftPayloads,
          writeOutcomes: automationFlow.writeOutcomes,
          products: automationFlow.products,
          productPayloads: automationFlow.productPayloads,
          results: automationFlow.results,
          vars: automationFlow.vars,
        },
      },
    };
  }

  if (executionMode === 'commit') {
    throw new Error('Import flow execution requires saved automation flow JSON.');
  }

  const result = await resolvePlaywrightProgrammableImportSource({
    connection,
    input,
  });

  return {
    ok: true,
    scriptType: 'import',
    input,
    result: {
      scrapeSource: result.source,
      rawResult: result.rawResult,
      scrapedItems: result.products,
      rawProducts: result.products,
      mappedProducts: mappedProductsFromResult({ scrapedItems: result.products }),
    },
  };
};
