import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  evaluateLegacyPruneManifest,
  loadLegacyPruneManifest,
} from '../../../../scripts/ai-paths/legacy-prune-manifest-utils.mjs';

const makeTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ai-paths-manifest-utils-'));

const writeFile = (root: string, relativePath: string, content: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
};

const writeManifest = (root: string, manifest: unknown, relativePath = 'manifest.json') => {
  writeFile(root, relativePath, `${JSON.stringify(manifest, null, 2)}\n`);
  return relativePath;
};

describe('legacy-prune-manifest-utils', () => {
  it('source_scan flags forbidden tokens in runtime source and skips test files', () => {
    const root = makeTempRoot();
    try {
      writeFile(root, 'src/runtime.ts', "export const key = 'ai_paths_index_v1';\n");
      writeFile(root, 'src/__tests__/runtime.test.ts', "const ignored = 'ai_paths_index_v1';\n");

      const manifestPath = writeManifest(root, {
        version: 'test.v1',
        rules: [
          {
            id: 'legacy_index_scan',
            description: 'scan',
            targets: [
              {
                mode: 'source_scan',
                file: 'src',
                forbiddenSnippets: ['ai_paths_index_v1'],
                requiredSnippets: [],
              },
            ],
          },
        ],
      });

      const manifest = loadLegacyPruneManifest(root, manifestPath);
      const findings = evaluateLegacyPruneManifest(manifest, {
        root,
        includeTargetFileMissingFindings: true,
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual(
        expect.objectContaining({
          ruleId: 'legacy_index_scan',
          file: 'src/runtime.ts',
          type: 'forbidden_snippet_present',
        })
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('expectedState=missing reports present retired files', () => {
    const root = makeTempRoot();
    try {
      writeFile(root, 'src/legacy.ts', 'export const legacy = true;\n');
      const manifestPath = writeManifest(root, {
        version: 'test.v1',
        rules: [
          {
            id: 'retired_file',
            description: 'retired',
            targets: [
              {
                file: 'src/legacy.ts',
                expectedState: 'missing',
                forbiddenSnippets: [],
                requiredSnippets: [],
              },
            ],
          },
        ],
      });

      const manifest = loadLegacyPruneManifest(root, manifestPath);
      const findings = evaluateLegacyPruneManifest(manifest, {
        root,
        includeTargetFileMissingFindings: true,
      });

      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual(
        expect.objectContaining({
          ruleId: 'retired_file',
          file: 'src/legacy.ts',
          type: 'unexpected_target_file_present',
        })
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('const_array enforces exact ordered values', () => {
    const root = makeTempRoot();
    try {
      writeFile(
        root,
        'src/constants.ts',
        [
          'export const AI_PATHS_MAINTENANCE_ACTION_IDS = [',
          "  'compact_oversized_configs',",
          "  'repair_path_index',",
          "  'ensure_starter_workflow_defaults',",
          '] as const;',
          '',
        ].join('\n')
      );

      const manifestPath = writeManifest(root, {
        version: 'test.v1',
        rules: [
          {
            id: 'maintenance_const_array',
            description: 'array',
            targets: [
              {
                mode: 'const_array',
                file: 'src/constants.ts',
                arrayName: 'AI_PATHS_MAINTENANCE_ACTION_IDS',
                expectedItems: [
                  'compact_oversized_configs',
                  'repair_path_index',
                  'ensure_starter_workflow_defaults',
                ],
              },
            ],
          },
        ],
      });

      const manifest = loadLegacyPruneManifest(root, manifestPath);
      const findings = evaluateLegacyPruneManifest(manifest, {
        root,
        includeTargetFileMissingFindings: true,
      });
      expect(findings).toEqual([]);

      const mismatchManifestPath = writeManifest(root, {
        version: 'test.v1',
        rules: [
          {
            id: 'maintenance_const_array_mismatch',
            description: 'array',
            targets: [
              {
                mode: 'const_array',
                file: 'src/constants.ts',
                arrayName: 'AI_PATHS_MAINTENANCE_ACTION_IDS',
                expectedItems: ['compact_oversized_configs'],
              },
            ],
          },
        ],
      });

      const mismatchManifest = loadLegacyPruneManifest(root, mismatchManifestPath);
      const mismatchFindings = evaluateLegacyPruneManifest(mismatchManifest, {
        root,
        includeTargetFileMissingFindings: true,
      });

      expect(mismatchFindings).toHaveLength(1);
      expect(mismatchFindings[0]).toEqual(
        expect.objectContaining({
          ruleId: 'maintenance_const_array_mismatch',
          file: 'src/constants.ts',
          type: 'const_array_items_mismatch',
        })
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
