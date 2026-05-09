import { describe, expect, it } from 'vitest';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';

describe('contextRegistryConsumerEnvelopeSchema', () => {
  it('normalizes legacy nullable ref metadata', () => {
    const parsed = contextRegistryConsumerEnvelopeSchema.safeParse({
      refs: [
        {
          id: 'page:product-editor',
          kind: 'static_node',
          providerId: null,
          entityType: null,
        },
      ],
      engineVersion: 'page-context:v1',
      resolved: {
        refs: [
          {
            id: 'page:product-editor',
            kind: 'static_node',
            providerId: null,
            entityType: null,
          },
        ],
        nodes: [
          {
            id: 'page:product-editor',
            kind: 'page',
            name: 'Product Editor',
            description: 'Product editing workspace.',
            tags: ['products'],
            relationships: [],
            jsonSchema2020: null,
            examples: null,
            permissions: {
              readScopes: ['ctx:read'],
              riskTier: 'none',
              classification: 'internal',
            },
            version: '1.0.0',
            updatedAtISO: '2026-03-09T00:00:00.000Z',
            source: {
              type: 'code',
              ref: 'test',
            },
          },
        ],
        documents: [],
        truncated: false,
        engineVersion: 'page-context:v1',
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.refs[0]?.providerId).toBeUndefined();
    expect(parsed.data.refs[0]?.entityType).toBeUndefined();
    expect(parsed.data.resolved?.refs[0]?.providerId).toBeUndefined();
    expect(parsed.data.resolved?.refs[0]?.entityType).toBeUndefined();
    expect(parsed.data.resolved?.nodes[0]?.jsonSchema2020).toBeUndefined();
    expect(parsed.data.resolved?.nodes[0]?.examples).toBeUndefined();
  });
});
