import { describe, expect, it } from 'vitest';

import {
  aiPathRunEnqueueResponseSchema,
  extractAiPathRunIdFromEnqueueContractPayload,
} from '@/shared/contracts/ai-paths';

describe('ai-paths enqueue response contract', () => {
  it('accepts canonical enqueue response payloads', () => {
    const payload = {
      run: {
        id: 'run-contract-1',
        status: 'queued',
      },
    };
    const parsed = aiPathRunEnqueueResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(extractAiPathRunIdFromEnqueueContractPayload(payload)).toBe('run-contract-1');
  });

  it('rejects legacy and mixed enqueue payloads', () => {
    expect(
      aiPathRunEnqueueResponseSchema.safeParse({
        run: { _id: 'run-legacy-contract', status: 'queued' },
      }).success
    ).toBe(false);

    expect(
      aiPathRunEnqueueResponseSchema.safeParse({
        run: { status: 'queued' },
        runId: 'run-mixed-contract',
      }).success
    ).toBe(false);

    expect(
      aiPathRunEnqueueResponseSchema.safeParse({
        data: { runId: 'run-nested-contract' },
      }).success
    ).toBe(false);
  });

  it('rejects enqueue payloads without any run identifier', () => {
    const payload = {
      run: { status: 'queued' },
    };
    const parsed = aiPathRunEnqueueResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    expect(extractAiPathRunIdFromEnqueueContractPayload(payload)).toBeNull();
  });

  it('rejects wrapper id/pathId payloads that are not run identifiers', () => {
    const payload = {
      id: 'path_wrapper_id',
      pathId: 'path_wrapper_id',
      run: { status: 'queued' },
    };
    const parsed = aiPathRunEnqueueResponseSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    expect(extractAiPathRunIdFromEnqueueContractPayload(payload)).toBeNull();
  });
});
