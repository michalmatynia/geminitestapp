import {
  VALIDATOR_FUNCTION_DOC_IDS,
} from '../../src/features/products/components/settings/validator-settings/validator-docs-catalog';

import { collectValidatorExportedCallables } from './validator-docs-utils';

const workspaceRoot = process.cwd();
const exportedCallables = collectValidatorExportedCallables(workspaceRoot);

const missingJsDoc = exportedCallables.filter((entry) => !entry.hasJsDoc);
const missingCatalog = exportedCallables.filter((entry) => !VALIDATOR_FUNCTION_DOC_IDS.has(entry.id));

if (missingJsDoc.length > 0 || missingCatalog.length > 0) {
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

  process.exit(1);
}

console.log(`Validator docs coverage check passed for ${exportedCallables.length} exported callables.`);
