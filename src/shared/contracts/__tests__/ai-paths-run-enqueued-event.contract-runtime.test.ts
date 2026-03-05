import { describe, expect, it } from 'vitest';

import {
  aiPathRunEnqueuedEventSchema,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';

describe('ai-paths run enqueued event contract', () => {
  it('normalizes canonical event payload fields', () => {
    const parsed = aiPathRunEnqueuedEventSchema.safeParse({
      runId: ' run-1 ',
      entityType: 'PRODUCT',
      entityId: ' product-1 ',
      at: Date.now(),
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      type: 'run-enqueued',
      runId: 'run-1',
      entityType: 'product',
      entityId: 'product-1',
    });
  });

  it('rejects payloads without runId', () => {
    const parsed = aiPathRunEnqueuedEventSchema.safeParse({
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(parsed.success).toBe(false);
    expect(
      parseAiPathRunEnqueuedEventPayload({
        entityType: 'product',
        entityId: 'product-1',
      })
    ).toBeNull();
  });

  it('returns null for malformed payloads and parsed value for valid payloads', () => {
    expect(parseAiPathRunEnqueuedEventPayload('invalid')).toBeNull();
    expect(parseAiPathRunEnqueuedEventPayload({ runId: 'run-2' })).toEqual({
      type: 'run-enqueued',
      runId: 'run-2',
      entityType: null,
      entityId: null,
    });
  });
});
