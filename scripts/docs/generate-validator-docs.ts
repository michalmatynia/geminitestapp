import fs from 'node:fs';
import path from 'node:path';

import {
  VALIDATOR_FUNCTION_DOCS,
  VALIDATOR_UI_DOCS,
} from '../../src/features/products/components/settings/validator-settings/validator-docs-catalog';

import { collectValidatorExportedCallables } from './validator-docs-utils';

const workspaceRoot = process.cwd();
const docsDir = path.join(workspaceRoot, 'docs/validator');

const functionReferenceLines: string[] = [
  '# Validator Function Reference',
  '',
  'Generated from `src/features/products/components/settings/validator-settings/validator-docs-catalog.ts`.',
  '',
  '| ID | Symbol | File | Purpose |',
  '| --- | --- | --- | --- |',
  ...VALIDATOR_FUNCTION_DOCS.map(
    (doc) => `| ${doc.id} | \`${doc.symbol}\` | \`${doc.file}\` | ${doc.purpose} |`,
  ),
  '',
];

for (const doc of VALIDATOR_FUNCTION_DOCS) {
  functionReferenceLines.push(`### ${doc.id}`);
  functionReferenceLines.push('');
  functionReferenceLines.push(`- File: \`${doc.file}\``);
  functionReferenceLines.push(`- Symbol: \`${doc.symbol}\``);
  functionReferenceLines.push(`- Purpose: ${doc.purpose}`);
  functionReferenceLines.push(`- Parameters: ${doc.params.join(' ')}`);
  functionReferenceLines.push(`- Returns: ${doc.returns}`);
  functionReferenceLines.push(`- Errors: ${doc.errors.join(' ')}`);
  functionReferenceLines.push(`- Edge Cases: ${doc.edgeCases.join(' ')}`);
  functionReferenceLines.push(`- Example: \`${doc.example}\``);
  functionReferenceLines.push('');
}

const uiTooltipLines: string[] = [
  '# Validator Tooltip Reference',
  '',
  'These tooltips are consumed directly by validator UI components when `Docs Tooltips` is enabled.',
  '',
  '| ID | Title | Description | Related Functions |',
  '| --- | --- | --- | --- |',
  ...VALIDATOR_UI_DOCS.map(
    (doc) =>
      `| ${doc.id} | ${doc.title} | ${doc.description} | ${doc.relatedFunctions.join(', ')} |`,
  ),
  '',
];

const inventory = collectValidatorExportedCallables(workspaceRoot);
const catalogIdSet = new Set(VALIDATOR_FUNCTION_DOCS.map((doc) => doc.id));
const inventoryLines: string[] = [
  '# Validator Function Inventory',
  '',
  '| File | Symbol | ID | JSDoc | Catalog |',
  '| --- | --- | --- | --- | --- |',
  ...inventory.map((entry) => {
    const hasCatalog = catalogIdSet.has(entry.id);
    return `| \`${entry.file}:${entry.line}\` | \`${entry.symbol}\` | ${entry.id} | ${
      entry.hasJsDoc ? 'yes' : 'no'
    } | ${hasCatalog ? 'yes' : 'no'} |`;
  }),
  '',
];

const architectureLines = [
  '# Validator Architecture',
  '',
  '## Validation Pipeline',
  '1. UI (`ValidatorSettings`) writes pattern definitions, launch rules, replacement strategy, and runtime config.',
  '2. Static engine (`buildFieldIssues`) evaluates regex patterns in deterministic sequence order.',
  '3. Runtime engine (`/api/products/validator-runtime/evaluate`) evaluates DB/AI runtime patterns.',
  '4. Maps are merged by `mergeFieldIssueMaps` and consumed by form hooks/components.',
  '',
  '## Function Layers',
  '- Settings orchestration: `useValidatorSettingsController`, `createSequenceActions`.',
  '- Static evaluation: functions in `src/features/products/validation-engine/core.ts`.',
  '- Pattern authoring helpers: `helpers.ts`, `controller-form-utils.ts`.',
  '- Scope/list resolution: `src/features/admin/pages/validator-scope.ts`.',
  '',
  '## Extension Points',
  '- Add new pattern templates in `controller-sequence-actions.ts`.',
  '- Add new replacement/runtime options in modal options + helper normalizers.',
  '- Extend runtime evaluation contract via `runtimeType` and runtime handler.',
  '',
  '## Performance Notes',
  '- Sequence ordering and scope filters run before regex execution to reduce work.',
  '- Debounce values are normalized and capped at 30 seconds.',
  '- Runtime patterns are pre-filtered by target, locale, scope, and launch gates.',
  '',
];

const examplesLines = [
  '# Validator Examples',
  '',
  '## Example: Static Regex Pattern',
  'Pattern: target=`name`, regex=`\\s{2,}`, replacement=` `.',
  'Result: `buildFieldIssues` returns warning issue with replacement preview collapsing duplicate spaces.',
  '',
  '## Example: Sequence Group',
  'Group contains mirror pattern followed by category-specific replacements.',
  'Result: sequence emits one aggregated replacement issue when final output differs from original value.',
  '',
  '## Example: Runtime DB Pattern',
  'Runtime config queries latest product and checks `count > 0`.',
  'Result: runtime evaluator adds issue with optional replacement value resolved from `replacementPath`.',
  '',
  '## Example: Launch Gate',
  'Launch source mode uses `latest_product_field` and regex operator.',
  'Result: pattern executes only when launch condition is true.',
  '',
];

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, 'function-reference.md'), functionReferenceLines.join('\n'));
fs.writeFileSync(path.join(docsDir, 'tooltips.md'), uiTooltipLines.join('\n'));
fs.writeFileSync(path.join(docsDir, 'function-inventory.md'), inventoryLines.join('\n'));
fs.writeFileSync(path.join(docsDir, 'architecture.md'), architectureLines.join('\n'));
fs.writeFileSync(path.join(docsDir, 'examples.md'), examplesLines.join('\n'));

const readmeLines = [
  '# Validator Docs',
  '',
  'Generated and maintained docs for the Product Validator tool.',
  '',
  '- Function reference: `docs/validator/function-reference.md`',
  '- Tooltip reference: `docs/validator/tooltips.md`',
  '- Function inventory: `docs/validator/function-inventory.md`',
  '- Architecture: `docs/validator/architecture.md`',
  '- Examples: `docs/validator/examples.md`',
  '',
  'Regenerate with:',
  '',
  '```bash',
  'npm run docs:validator:generate',
  '```',
  '',
];
fs.writeFileSync(path.join(docsDir, 'README.md'), readmeLines.join('\n'));

console.log('Validator docs generated.');
