import { describe, expect, it } from 'vitest';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import type { AiNode } from '@/shared/contracts/ai-paths';

const buildParserNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'parser-1',
    type: 'parser',
    title: 'JSON Parser',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    position: { x: 120, y: 80 },
    data: {},
    inputs: ['entityJson', 'context'],
    outputs: ['bundle', 'images (urls)', 'title'],
    config: {
      parser: {
        mappings: {
          'images (urls)': 'images',
          title: 'title',
        },
        outputMode: 'bundle',
      },
    },
    ...patch,
  }) as AiNode;

describe('parser port normalization', () => {
  it('canonicalizes legacy parser image output aliases', () => {
    const [normalized] = normalizeNodes([buildParserNode()]);

    expect(normalized?.outputs).toEqual(['bundle', 'images']);
    expect(normalized?.config?.parser?.mappings).toMatchObject({
      images: 'images',
      title: 'title',
    });
    expect(normalized?.config?.parser?.mappings).not.toHaveProperty('images (urls)');
  });
});

