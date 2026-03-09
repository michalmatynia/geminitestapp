import { VALIDATOR_FUNCTION_DOC_IDS } from '../../src/features/products/components/settings/validator-settings/validator-docs-catalog';
import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

import { collectValidatorExportedCallables } from './validator-docs-utils';

const logFailures = ({
  missingJsDoc,
  missingCatalog,
}: {
  missingJsDoc: ReturnType<typeof collectValidatorExportedCallables>;
  missingCatalog: ReturnType<typeof collectValidatorExportedCallables>;
}): void => {
  if (missingJsDoc.length > 0) {
    console.error('Missing JSDoc on exported validator callables:');
    for (const entry of missingJsDoc) {
      console.error(`- ${entry.file}:${entry.line} (${entry.id})`);
    }
  }

  if (missingCatalog.length > 0) {
    console.error('Missing function docs catalog entries:');
    for (const entry of missingCatalog) {
      console.error(`- ${entry.id} (${entry.file}:${entry.line})`);
    }
  }
};

const main = (): void => {
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const generatedAt = new Date().toISOString();
  const workspaceRoot = process.cwd();
  const exportedCallables = collectValidatorExportedCallables(workspaceRoot);
  const missingJsDoc = exportedCallables.filter((entry) => !entry.hasJsDoc);
  const missingCatalog = exportedCallables.filter((entry) => !VALIDATOR_FUNCTION_DOC_IDS.has(entry.id));
  const issueCount = missingJsDoc.length + missingCatalog.length;

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'docs-validator-doc-coverage',
      generatedAt,
      status: issueCount === 0 ? 'ok' : 'failed',
      summary: {
        exportedCallableCount: exportedCallables.length,
        missingJsDocCount: missingJsDoc.length,
        missingCatalogCount: missingCatalog.length,
        issueCount,
      },
      details: {
        missingJsDoc,
        missingCatalog,
      },
      filters: buildStaticCheckFilters({ strictMode, failOnWarnings }),
      notes: ['validator docs coverage check result'],
    });
    if (issueCount > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (issueCount > 0) {
    logFailures({ missingJsDoc, missingCatalog });
    process.exitCode = 1;
    return;
  }

  console.log(`Validator docs coverage check passed for ${exportedCallables.length} exported callables.`);
};

main();
