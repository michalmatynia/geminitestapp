import { describe, expect, it } from 'vitest';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import type { AiNode } from '@/shared/contracts/ai-paths';

const buildNode = (
  type: 'fetcher' | 'simulation',
  config: Record<string, unknown>,
): AiNode =>
  ({
    id: `${type}-node-1`,
    type,
    title: type,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: [],
    config,
  }) as AiNode;

describe('fetcher and simulation node normalization', () => {
  it('backfills fetcher entityId and productId from the legacy productId field', () => {
    const [normalized] = normalizeNodes([
      buildNode('fetcher', {
        fetcher: {
          productId: 'product-123',
        },
      }),
    ]);

    expect(normalized?.config?.fetcher).toMatchObject({
      sourceMode: 'live_context',
      entityType: 'product',
      entityId: 'product-123',
      productId: 'product-123',
    });
  });

  it('backfills simulation productId from entityId while preserving run behavior', () => {
    const [normalized] = normalizeNodes([
      buildNode('simulation', {
        simulation: {
          entityId: 'product-456',
          entityType: 'product',
          runBehavior: 'after_connected_trigger',
        },
      }),
    ]);

    expect(normalized?.config?.simulation).toMatchObject({
      entityId: 'product-456',
      entityType: 'product',
      productId: 'product-456',
      runBehavior: 'after_connected_trigger',
    });
  });
});
