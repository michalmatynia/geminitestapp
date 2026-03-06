import { describe, expect, it } from 'vitest';

import {
  NODE_PORT_VALUE_KIND_VALUES,
  nodePortContractSchema,
  normalizeNodePortValueKind,
} from '@/shared/contracts/ai-paths-core';

describe('ai-paths port contracts v3 runtime contract', () => {
  it('keeps legacy contracts valid when kind metadata is omitted', () => {
    const parsed = nodePortContractSchema.safeParse({
      required: true,
      cardinality: 'single',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      required: true,
      cardinality: 'single',
    });
  });

  it('accepts additive kind and schema metadata', () => {
    const parsed = nodePortContractSchema.safeParse({
      required: false,
      cardinality: 'many',
      kind: 'image_url',
      schema: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
      },
      schemaRef: 'ai-paths.port.image_urls.v1',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      required: false,
      cardinality: 'many',
      kind: 'image_url',
      schemaRef: 'ai-paths.port.image_urls.v1',
    });
  });

  it('normalizes supported kind aliases and rejects non-canonical ones', () => {
    expect(normalizeNodePortValueKind(' image url ')).toBe('image_url');
    expect(normalizeNodePortValueKind('JOB_ENVELOPE')).toBe('job_envelope');
    expect(normalizeNodePortValueKind('binary')).toBeNull();
  });

  it('keeps normalization helper aligned with the enum contract', () => {
    NODE_PORT_VALUE_KIND_VALUES.forEach((kind) => {
      expect(normalizeNodePortValueKind(kind)).toBe(kind);
    });
  });
});
