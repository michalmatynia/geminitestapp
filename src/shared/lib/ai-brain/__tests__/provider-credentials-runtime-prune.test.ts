import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const runtimeFiles = [
  path.join(projectRoot, 'src/shared/lib/ai-brain/provider-credentials.ts'),
  path.join(projectRoot, 'src/features/ai/image-studio/server/handlers/generation-handler.ts'),
  path.join(projectRoot, 'src/features/ai/image-studio/components/ImageStudioDocsContent.tsx'),
  path.join(
    projectRoot,
    'src/features/ai/image-studio/components/settings/GenerationSettingsTab.tsx'
  ),
];

const forbiddenTokens = ['image_studio_openai_api_key', 'IMAGE_STUDIO_OPENAI_API_KEY_KEY'];

describe('ai brain provider credentials legacy prune guard', () => {
  it('keeps the removed Image Studio OpenAI alias out of Brain and Image Studio source', () => {
    const offenders = runtimeFiles
      .filter((absolute): boolean => {
        const content = readFileSync(absolute, 'utf8');
        return forbiddenTokens.some((token: string): boolean => content.includes(token));
      })
      .map((absolute): string => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });

  it('keeps feature UIs from reading provider keys directly through SettingsStore', () => {
    const featureFiles = [
      path.join(projectRoot, 'src/features/ai/image-studio/components/ImageStudioDocsContent.tsx'),
      path.join(
        projectRoot,
        'src/features/ai/image-studio/components/settings/GenerationSettingsTab.tsx'
      ),
    ];
    const forbiddenFeatureTokens = [
      "settingsStore.get('openai_api_key')",
      "settingsStore.get('anthropic_api_key')",
      "settingsStore.get('gemini_api_key')",
    ];

    const offenders = featureFiles
      .filter((absolute): boolean => {
        const content = readFileSync(absolute, 'utf8');
        return forbiddenFeatureTokens.some((token: string): boolean => content.includes(token));
      })
      .map((absolute): string => path.relative(projectRoot, absolute));

    expect(offenders).toEqual([]);
  });
});
