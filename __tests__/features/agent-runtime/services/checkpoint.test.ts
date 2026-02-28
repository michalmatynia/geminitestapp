import { vi, describe, it, expect, beforeEach } from 'vitest';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  parseCheckpoint,
  buildCheckpointState,
  persistCheckpoint,
} from '@/features/ai/agent-runtime/memory/checkpoint';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotAgentRun: { update: vi.fn() },
  },
}));

vi.mock('@/features/ai/agent-runtime/audit', () => ({
  logAgentAudit: vi.fn(),
}));

describe('Agent Runtime - Checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCheckpoint', () => {
    it('should return null for invalid payload', () => {
      expect(parseCheckpoint(null)).toBeNull();
      expect(parseCheckpoint({})).toBeNull();
      expect(parseCheckpoint({ steps: 'not an array' })).toBeNull();
    });

    it('should parse valid payload', () => {
      const payload = {
        steps: [{ id: '1', title: 'Step' }],
        activeStepId: '1',
      };
      const result = parseCheckpoint(payload);
      expect(result).not.toBeNull();
      expect(result?.steps).toHaveLength(1);
      expect(result?.activeStepId).toBe('1');
    });
  });

  describe('buildCheckpointState', () => {
    it('should create a valid checkpoint object', () => {
      const payload = {
        steps: [],
        activeStepId: null,
        lastError: 'Some error',
      };
      const result = buildCheckpointState(payload);
      expect(result.lastError).toBe('Some error');
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('persistCheckpoint', () => {
    it('should update prisma and log audit', async () => {
      const payload = {
        runId: 'run-1',
        steps: [],
        activeStepId: 'step-1',
      };

      await persistCheckpoint(payload);

      expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: expect.objectContaining({
            activeStepId: 'step-1',
            planState: expect.objectContaining({
              activeStepId: 'step-1',
            }),
          }),
        })
      );
      expect(logAgentAudit).toHaveBeenCalledWith(
        'run-1',
        'info',
        'Checkpoint saved.',
        expect.anything()
      );
    });
  });
});
