import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DOCS_REGISTRY_CONSTANTS_PATH,
  NODE_VALIDATOR_MANIFEST_PATH,
  TOOLTIP_MANIFEST_PATH,
  evaluateCanonicalManifestPathRules,
} from '../../../scripts/ai-paths/canonical-manifest-paths-utils.mjs';

const makeTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ai-paths-canonical-utils-'));

const writeFile = (root: string, relativePath: string, content: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
};

const writeJson = (root: string, relativePath: string, payload: unknown) => {
  writeFile(root, relativePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const writeConstantsFile = (root: string, args?: { includeSnippetsConst?: boolean }) => {
  const includeSnippetsConst = args?.includeSnippetsConst !== false;
  const lines = [
    "export const NODE_DOCS_CATALOG_SOURCE_PATH = 'src/shared/lib/ai-paths/core/docs/node-docs.ts';",
  ];
  if (includeSnippetsConst) {
    lines.push(
      "export const DOCS_SNIPPETS_SOURCE_PATH = 'src/shared/lib/ai-paths/core/definitions/docs-snippets.ts';"
    );
  }
  writeFile(root, DOCS_REGISTRY_CONSTANTS_PATH, `${lines.join('\n')}\n`);
};

const writeNodeValidatorManifest = (root: string, snippetsPath: string) => {
  writeJson(root, NODE_VALIDATOR_MANIFEST_PATH, {
    version: 'test.v1',
    sources: [
      {
        id: 'node-docs-catalog',
        type: 'node_docs_catalog',
        path: 'src/shared/lib/ai-paths/core/docs/node-docs.ts',
        enabled: true,
        priority: 80,
        tags: ['catalog'],
      },
      {
        id: 'docs-snippets',
        type: 'docs_snippet',
        path: snippetsPath,
        enabled: true,
        priority: 90,
        tags: ['snippets'],
      },
    ],
  });
};

const writeTooltipManifest = (root: string, snippetsPath: string) => {
  writeJson(root, TOOLTIP_MANIFEST_PATH, {
    version: 'test.v1',
    sources: [
      {
        id: 'ai-paths-doc-snippets',
        type: 'docs_snippet',
        path: snippetsPath,
        enabled: true,
        priority: 40,
        tags: ['snippets'],
      },
    ],
  });
};

describe('canonical-manifest-paths-utils', () => {
  it('returns no findings when manifests match canonical constants', () => {
    const root = makeTempRoot();
    try {
      const canonicalSnippetsPath = 'src/shared/lib/ai-paths/core/definitions/docs-snippets.ts';
      writeConstantsFile(root);
      writeNodeValidatorManifest(root, canonicalSnippetsPath);
      writeTooltipManifest(root, canonicalSnippetsPath);

      const findings = evaluateCanonicalManifestPathRules({ root });
      expect(findings).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports mismatched snippets path in manifests', () => {
    const root = makeTempRoot();
    try {
      writeConstantsFile(root);
      writeNodeValidatorManifest(root, 'src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts');
      writeTooltipManifest(root, 'src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts');

      const findings = evaluateCanonicalManifestPathRules({ root });
      expect(findings).toHaveLength(2);
      expect(findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            file: NODE_VALIDATOR_MANIFEST_PATH,
            message: expect.stringContaining('source "docs-snippets" must point to'),
          }),
          expect.objectContaining({
            file: TOOLTIP_MANIFEST_PATH,
            message: expect.stringContaining('source "ai-paths-doc-snippets" must point to'),
          }),
        ])
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports missing source path constants and stops early', () => {
    const root = makeTempRoot();
    try {
      writeConstantsFile(root, { includeSnippetsConst: false });
      writeNodeValidatorManifest(root, 'src/shared/lib/ai-paths/core/definitions/docs-snippets.ts');
      writeTooltipManifest(root, 'src/shared/lib/ai-paths/core/definitions/docs-snippets.ts');

      const findings = evaluateCanonicalManifestPathRules({ root });
      expect(findings).toEqual([
        expect.objectContaining({
          file: DOCS_REGISTRY_CONSTANTS_PATH,
          message: 'missing exported constant "DOCS_SNIPPETS_SOURCE_PATH".',
        }),
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
