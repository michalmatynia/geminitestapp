import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  PRODUCT_VALIDATION_INSTANCE_SCOPES,
  isPatternLaunchEnabledForValidationScope,
  isPatternReplacementEnabledForValidationScope,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const runtimeConfigFile = path.join(
  projectRoot,
  'src/features/products/validations/validator-runtime-config.ts'
);
const runtimeEvaluateFile = path.join(
  projectRoot,
  'src/app/api/v2/products/validator-runtime/evaluate/handler.ts'
);
const forbiddenScopeFallbackCompatPatterns = [
  /normalizeProductValidationPatternReplacementScopes\(\s*[^)]*,/m,
  /normalizeProductValidationPatternLaunchScopes\(\s*[^)]*,/m,
  /isPatternReplacementEnabledForValidationScope\(\s*[^)]*,\s*[^)]*,/m,
  /isPatternLaunchEnabledForValidationScope\(\s*[^)]*,\s*[^)]*,/m,
];

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (!absolute.endsWith('.ts') && !absolute.endsWith('.tsx')) continue;
    if (absolute.endsWith('.d.ts')) continue;
    if (
      absolute.endsWith('.test.ts') ||
      absolute.endsWith('.test.tsx') ||
      absolute.endsWith('.spec.ts') ||
      absolute.endsWith('.spec.tsx')
    ) {
      continue;
    }
    files.push(absolute);
  }

  return files;
};

describe('validator runtime canonical prune guard', () => {
  it('keeps legacy runtime-config aliases out of canonical runtime schema', () => {
    const content = readFileSync(runtimeConfigFile, 'utf8');
    const forbiddenSnippets = [
      'replacementPath: z.string().trim().optional()',
      'value: z.unknown().optional()',
      'expected: z.unknown().optional()',
      'collection: z.string().trim().optional()',
      'query: z.record(z.string(), z.unknown()).optional()',
    ];

    const found = forbiddenSnippets.filter((snippet: string): boolean => content.includes(snippet));
    expect(found).toEqual([]);
  });

  it('keeps validator runtime evaluation logic free of legacy alias fallbacks', () => {
    const content = readFileSync(runtimeEvaluateFile, 'utf8');
    const forbiddenSnippets = [
      'config[\'replacementPath\']',
      'config[\'value\']',
      'config[\'expected\']',
      'renderedPayload[\'query\']',
      'config[\'payload\'] as Record<string, unknown>)\n      : config;',
    ];

    const found = forbiddenSnippets.filter((snippet: string): boolean => content.includes(snippet));
    expect(found).toEqual([]);
  });

  it('keeps validator scope fallback compatibility call signatures out of runtime source', () => {
    const sourceFiles = collectSourceFiles(srcRoot);
    const offenders = sourceFiles
      .filter((absolutePath: string): boolean => {
        const content = readFileSync(absolutePath, 'utf8');
        return forbiddenScopeFallbackCompatPatterns.some((pattern: RegExp): boolean =>
          pattern.test(content)
        );
      })
      .map((absolutePath: string): string => path.relative(projectRoot, absolutePath));

    expect(offenders).toEqual([]);
  });

  it('defaults replacement and launch scopes to all runtime scopes when payload is missing', () => {
    expect(normalizeProductValidationPatternReplacementScopes(undefined)).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
    expect(normalizeProductValidationPatternReplacementScopes([])).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
    expect(normalizeProductValidationPatternLaunchScopes(undefined)).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
    expect(normalizeProductValidationPatternLaunchScopes([])).toEqual(
      PRODUCT_VALIDATION_INSTANCE_SCOPES
    );
  });

  it('keeps replacement/launch scope gating enabled for canonical defaults', () => {
    expect(isPatternReplacementEnabledForValidationScope(undefined, 'product_create')).toBe(true);
    expect(isPatternLaunchEnabledForValidationScope(undefined, 'product_edit')).toBe(true);
  });
});
