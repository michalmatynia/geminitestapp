import fs from 'node:fs';
import path from 'node:path';

export type ExportedCallable = {
  file: string;
  symbol: string;
  id: string;
  line: number;
  hasJsDoc: boolean;
};

export const TARGET_FILES = [
  'src/features/products/validation-engine/core.ts',
  'src/features/products/components/settings/validator-settings/helpers.ts',
  'src/features/products/components/settings/validator-settings/controller-form-utils.ts',
  'src/features/products/components/settings/validator-settings/controller-sequence-actions.ts',
  'src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts',
  'src/features/admin/pages/validator-scope.ts',
  'src/features/products/components/settings/ValidatorSettings.tsx',
  'src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx',
  'src/features/products/components/settings/validator-settings/ValidatorDefaultPanel.tsx',
  'src/features/products/components/settings/validator-settings/ValidatorInstanceBehaviorPanel.tsx',
  'src/features/products/components/settings/validator-settings/ValidatorPatternTablePanel.tsx',
  'src/features/products/components/settings/validator-settings/ValidatorPatternModal.tsx',
  'src/features/admin/pages/AdminGlobalValidatorPage.tsx',
  'src/features/admin/pages/AdminValidatorPatternListsPage.tsx',
] as const;

const ID_PREFIX_BY_FILE: Array<{ prefix: string; test: (file: string) => boolean }> = [
  { prefix: 'core', test: (file) => file.endsWith('/validation-engine/core.ts') },
  { prefix: 'helpers', test: (file) => file.endsWith('/validator-settings/helpers.ts') },
  {
    prefix: 'controller',
    test: (file) =>
      file.endsWith('/validator-settings/controller-form-utils.ts') ||
      file.endsWith('/validator-settings/controller-sequence-actions.ts') ||
      file.endsWith('/validator-settings/useValidatorSettingsController.ts'),
  },
  { prefix: 'scope', test: (file) => file.endsWith('/admin/pages/validator-scope.ts') },
  { prefix: 'ui', test: (file) => file.includes('/components/settings/') || file.includes('/admin/pages/Admin') },
];

const resolveIdPrefix = (file: string): string => {
  const found = ID_PREFIX_BY_FILE.find((entry) => entry.test(file));
  return found?.prefix ?? 'ui';
};

const hasJSDocBefore = (source: string, exportIndex: number): boolean => {
  const slice = source.slice(0, exportIndex);
  const lastCommentStart = slice.lastIndexOf('/**');
  if (lastCommentStart < 0) return false;
  const lastCommentEnd = slice.lastIndexOf('*/');
  if (lastCommentEnd < lastCommentStart) return false;
  const inBetween = slice.slice(lastCommentEnd + 2).trim();
  return inBetween.length === 0;
};

const collectFromFile = (workspaceRoot: string, file: string): ExportedCallable[] => {
  const fullPath = path.join(workspaceRoot, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const entries: ExportedCallable[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const functionMatch = line.match(/^export function\s+([A-Za-z0-9_]+)\s*\(/);
    if (functionMatch?.[1]) {
      const symbol = functionMatch[1];
      const exportIndex = content.indexOf(`export function ${symbol}`);
      const prefix = resolveIdPrefix(file);
      entries.push({
        file,
        symbol,
        id: `${prefix}.${symbol}`,
        line: index + 1,
        hasJsDoc: hasJSDocBefore(content, exportIndex),
      });
      continue;
    }

    const constFnMatch = line.match(
      /^export const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/,
    );
    if (constFnMatch?.[1]) {
      const symbol = constFnMatch[1];
      const exportIndex = content.indexOf(`export const ${symbol}`);
      const prefix = resolveIdPrefix(file);
      entries.push({
        file,
        symbol,
        id: `${prefix}.${symbol}`,
        line: index + 1,
        hasJsDoc: hasJSDocBefore(content, exportIndex),
      });
    }
  }

  return entries;
};

export const collectValidatorExportedCallables = (
  workspaceRoot: string,
): ExportedCallable[] => {
  return TARGET_FILES.flatMap((file: string) => collectFromFile(workspaceRoot, file));
};
