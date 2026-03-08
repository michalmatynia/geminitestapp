import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const runtimeFiles = [
  path.join(projectRoot, 'src/features/case-resolver/workspace-persistence-detached-history.ts'),
  path.join(projectRoot, 'src/features/case-resolver/workspace-persistence-detached-documents.ts'),
  path.join(projectRoot, 'src/features/case-resolver/workers/case-resolver-ocr/processors/openai.ts'),
  path.join(
    projectRoot,
    'src/features/case-resolver/workers/case-resolver-ocr/processors/anthropic.ts'
  ),
  path.join(projectRoot, 'src/features/case-resolver/workers/case-resolver-ocr/processors/gemini.ts'),
];

const forbiddenTokens = [
  'case_resolver_workspace_detached_history_v1',
  'case_resolver_workspace_detached_documents_v1',
  '../api-keys',
  'resolveOpenAiApiKey(',
  'resolveAnthropicApiKey(',
  'resolveGeminiApiKey(',
];

describe('case resolver runtime legacy-compat prune guard', () => {
  it('keeps removed legacy compatibility tokens out of runtime source', () => {
    const offenders = runtimeFiles
      .filter((absolute): boolean => {
        const content = readFileSync(absolute, 'utf8');
        return forbiddenTokens.some((token: string): boolean => content.includes(token));
      })
      .map((absolute): string => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
