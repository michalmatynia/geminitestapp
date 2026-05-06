import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURE_ROOT = path.join(process.cwd(), 'src/features');
const FORBIDDEN_SNIPPET = 'createMasterFolderTreeTransactionAdapter';
const SHELL_HOOK_SNIPPET = 'useMasterFolderTreeShell';
const SEARCH_HOOK_SNIPPET = 'useMasterFolderTreeSearch';
const VIEW_MODEL_HOOK_SNIPPET = 'useMasterFolderTreeViewModel';
const LOW_LEVEL_VIEWPORT_SNIPPET = 'FolderTreeViewportV2';
const CENTRALIZED_ADAPTER_HELPER_PATTERN =
  /createMasterFolderTree(?:OrderedItems|Nodes|Projection)Adapter/;

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }
    if (!entry.isFile()) return [];
    if (entry.name.endsWith('.d.ts')) return [];
    return /\.(ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });

const isTestSourceFile = (absolutePath: string): boolean =>
  absolutePath.includes(`${path.sep}__tests__${path.sep}`) ||
  /\.(test|spec)\.(ts|tsx)$/.test(absolutePath);

describe('master folder tree adapter boundaries', () => {
  it('keeps feature code on centralized adapter helpers', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => readFileSync(absolutePath, 'utf8').includes(FORBIDDEN_SNIPPET))
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });

  it('keeps searchable production trees on the shared view-model hook', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => !isTestSourceFile(absolutePath))
      .filter((absolutePath) => {
        const source = readFileSync(absolutePath, 'utf8');
        return source.includes(SHELL_HOOK_SNIPPET) && source.includes(SEARCH_HOOK_SNIPPET);
      })
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });

  it('keeps centralized adapter helper consumers on the shared view-model hook', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => !isTestSourceFile(absolutePath))
      .filter((absolutePath) => {
        const source = readFileSync(absolutePath, 'utf8');
        return (
          CENTRALIZED_ADAPTER_HELPER_PATTERN.test(source) &&
          source.includes(SHELL_HOOK_SNIPPET)
        );
      })
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });

  it('keeps view-model production trees on the view-model viewport wrapper', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => !isTestSourceFile(absolutePath))
      .filter((absolutePath) => {
        const source = readFileSync(absolutePath, 'utf8');
        return (
          source.includes(VIEW_MODEL_HOOK_SNIPPET) &&
          source.includes(LOW_LEVEL_VIEWPORT_SNIPPET)
        );
      })
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });

  it('keeps production feature trees off the raw shell hook', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => !isTestSourceFile(absolutePath))
      .filter((absolutePath) => readFileSync(absolutePath, 'utf8').includes(SHELL_HOOK_SNIPPET))
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });

  it('keeps production feature trees on viewport wrappers', () => {
    const violations = collectSourceFiles(FEATURE_ROOT)
      .filter((absolutePath) => !isTestSourceFile(absolutePath))
      .filter((absolutePath) =>
        /<FolderTreeViewportV2\b/.test(readFileSync(absolutePath, 'utf8'))
      )
      .map((absolutePath) => path.relative(process.cwd(), absolutePath));

    expect(violations).toEqual([]);
  });
});
