import {
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { buildAiPathsMaintenanceReport } from '@/features/ai/ai-paths/server/settings-store.maintenance';
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('starter workflow guardrails', () => {
  const readTsFilesRecursively = (dirPath: string): string[] => {
    const entries = readdirSync(dirPath);
    return entries.flatMap((entry) => {
      const absolutePath = join(dirPath, entry);
      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        if (entry === '__tests__') return [];
        return readTsFilesRecursively(absolutePath);
      }
      if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) return [];
      return [absolutePath];
    });
  };

  it('does not keep workflow-specific settings-store modules', () => {
    const serverDir = join(process.cwd(), 'src', 'features', 'ai', 'ai-paths', 'server');
    const allowed = new Set([
      'settings-store.constants.ts',
      'settings-store.helpers.ts',
      'settings-store.parsing.ts',
      'settings-store.repository.ts',
      'settings-store.compaction.ts',
      'settings-store.maintenance.ts',
      'settings-store.ts',
    ]);

    const offenders = readdirSync(serverDir).filter((fileName) => {
      if (!fileName.startsWith('settings-store-')) return false;
      return !allowed.has(fileName);
    });

    expect(offenders).toEqual([]);
  });

  it('does not import legacy workflow-specific server builders', () => {
    const serverDir = join(process.cwd(), 'src', 'features', 'ai', 'ai-paths', 'server');
    const forbiddenImportPatterns = [
      'settings-store-translation-en-pl',
      'settings-store-parameter-inference',
      'settings-store-description-inference',
      'settings-store-base-export-workflow',
      '/server/inference/config',
      '/server/inference/nodes',
      '/server/inference/edges',
    ];

    const sourceFiles = readTsFilesRecursively(serverDir);
    sourceFiles.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      forbiddenImportPatterns.forEach((forbiddenPattern) => {
        expect(source.includes(forbiddenPattern)).toBe(false);
      });
    });
  });

  it('does not import starter-specific upgrade helpers in runtime sanitizers', () => {
    const workspaceRoot = process.cwd();
    const runtimeSanitizerFiles = [
      join(workspaceRoot, 'src', 'shared', 'lib', 'ai-paths', 'hooks', 'useAiPathTriggerEvent.ts'),
      join(
        workspaceRoot,
        'src',
        'shared',
        'lib',
        'ai-paths',
        'core',
        'normalization',
        'trigger-normalization.ts'
      ),
      join(
        workspaceRoot,
        'src',
        'shared',
        'lib',
        'ai-paths',
        'core',
        'utils',
        'path-config-sanitization.ts'
      ),
      join(
        workspaceRoot,
        'src',
        'shared',
        'lib',
        'ai-paths',
        'core',
        'utils',
        'runtime-state.ts'
      ),
    ];

    runtimeSanitizerFiles.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source.includes('upgradeStarterWorkflowPathConfig')).toBe(false);
    });
  });

  it('does not emit workflow-specific maintenance action ids', () => {
    const report = buildAiPathsMaintenanceReport([
      { key: AI_PATHS_INDEX_KEY, value: '[]' },
      { key: AI_PATHS_TRIGGER_BUTTONS_KEY, value: '[]' },
    ]);

    const deprecatedActionIds = new Set([
      'migrate_legacy_starter_workflows',
      'ensure_parameter_inference_defaults',
      'ensure_description_inference_defaults',
      'ensure_base_export_defaults',
      'upgrade_translation_en_pl',
    ]);

    expect(report.actions.some((action) => deprecatedActionIds.has(action.id))).toBe(false);
  });

  it('keeps starter upgrade routing registry-driven instead of branching on starter keys', () => {
    const workspaceRoot = process.cwd();
    const upgradeSource = readFileSync(
      join(
        workspaceRoot,
        'src',
        'shared',
        'lib',
        'ai-paths',
        'core',
        'starter-workflows',
        'segments',
        'upgrade.ts'
      ),
        'utf8'
    );
    const templatesSource = readFileSync(
      join(
        workspaceRoot,
        'src',
        'shared',
        'lib',
        'ai-paths',
        'core',
        'starter-workflows',
        'segments',
        'templates.ts'
      ),
      'utf8'
    );

    [
      "'parameter_inference'",
      "'product_name_normalize'",
      "'description_inference_lite'",
      "'marketplace_copy_debrand'",
      "'translation_en_pl'",
    ].forEach((starterKeyLiteral) => {
      expect(upgradeSource.includes(`starterLineage.starterKey === ${starterKeyLiteral}`)).toBe(false);
    });

    expect(upgradeSource.includes('legacy_alias')).toBe(false);
    expect(templatesSource.includes('legacyRepairMatcher')).toBe(false);
  });

  it('does not hardcode Description Lite flow semantics in runtime or product workers', () => {
    const workspaceRoot = process.cwd();
    const sourceRoots = [
      join(workspaceRoot, 'src', 'app', 'api', 'ai-paths'),
      join(workspaceRoot, 'src', 'features', 'ai', 'ai-paths', 'services'),
      join(workspaceRoot, 'src', 'features', 'ai', 'ai-paths', 'workers'),
      join(workspaceRoot, 'src', 'features', 'products', 'workers'),
      join(workspaceRoot, 'src', 'shared', 'lib', 'ai-paths', 'core', 'runtime'),
    ];
    const forbiddenFlowLiterals = [
      'path_descv3lite',
      'description_inference_lite',
      'starter_description_inference_lite',
      'selectedDescription',
      'qualityScore',
      'finalDescription',
      'fallbackDescription',
    ];

    const offenders = sourceRoots.flatMap((root) =>
      readTsFilesRecursively(root).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return forbiddenFlowLiterals
          .filter((literal) => source.includes(literal))
          .map((literal) => `${filePath.replace(`${workspaceRoot}/`, '')}: ${literal}`);
      })
    );

    expect(offenders).toEqual([]);
  });

  it('keeps product workflow identifiers out of AI-Paths execution services', () => {
    const workspaceRoot = process.cwd();
    const sourceRoots = [
      join(workspaceRoot, 'src', 'features', 'ai', 'ai-paths', 'services'),
      join(workspaceRoot, 'src', 'features', 'ai', 'ai-paths', 'workers'),
      join(workspaceRoot, 'src', 'shared', 'lib', 'ai-paths', 'core', 'runtime'),
    ];
    const forbiddenProductFlowLiterals = [
      'path_descv3lite',
      'description_inference_lite',
      'starter_description_inference_lite',
      'path_marketplace_copy_debrand_v1',
      'marketplace_copy_debrand',
      'product_marketplace_copy_debrand',
      'marketplace-copy-debrand',
      'path_name_normalize_v1',
      'product_name_normalize',
      'starter_product_name_normalize',
    ];

    const offenders = sourceRoots.flatMap((root) =>
      readTsFilesRecursively(root).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return forbiddenProductFlowLiterals
          .filter((literal) => source.includes(literal))
          .map((literal) => `${filePath.replace(`${workspaceRoot}/`, '')}: ${literal}`);
      })
    );

    expect(offenders).toEqual([]);
  });
});
