import { describe, expect, it } from 'vitest';

import { getDefaultConfigForType, normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import type { AiNode } from '@/shared/contracts/ai-paths';

describe('model node normalization', () => {
  it('preserves modelId when the node selected an explicit model', () => {
    const rawNode = {
      id: 'node-model',
      type: 'model',
      title: 'Model',
      description: '',
      position: { x: 0, y: 0 },
      data: {},
      inputs: ['prompt'],
      outputs: ['result'],
      config: {
        model: {
          modelId: 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 512,
        },
      },
    } as AiNode;

    const [normalized] = normalizeNodes([rawNode]);

    expect(normalized?.config?.model).toMatchObject({
      modelId: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 512,
    });
  });

  it('creates default model config without a modelId so the node inherits Brain default', () => {
    const config = getDefaultConfigForType('model', ['prompt'], ['result']);

    expect(config?.model).toMatchObject({
      temperature: 0.7,
      maxTokens: 800,
    });
    expect(config?.model).not.toHaveProperty('modelId');
  });
});
