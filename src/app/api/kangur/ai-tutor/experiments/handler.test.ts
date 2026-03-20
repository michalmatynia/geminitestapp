import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET_handler, PUT_handler } from './handler';
import * as kangurAuth from '@/features/kangur/server';
import * as brainServer from '@/shared/lib/ai-brain/server';

// Mock dependencies
vi.mock('@/features/kangur/server', () => ({
  requireActiveLearner: vi.fn(),
  resolveKangurActor: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: vi.fn(),
  upsertStoredSettingValue: vi.fn(),
}));

const mockActor = { id: 'actor-123' };
const mockLearner = { id: 'learner-456' };

describe('experiments handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET_handler', () => {
    it('returns 400 on missing learner', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockImplementationOnce(() => {
        throw new Error('No active learner');
      });

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments');
      try {
        await GET_handler(req);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('active learner');
      }
    });

    it('returns current experiment flags for learner', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);
      vi.mocked(brainServer.readStoredSettingValue).mockResolvedValueOnce(
        JSON.stringify({
          'learner-456': {
            enabled: true,
            experimentFlags: { coachingMode: 'hint_ladder', contextStrategy: null },
          },
        })
      );

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments');
      const res = await GET_handler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.learnerId).toBe('learner-456');
      expect(json.experimentFlags).toEqual({ coachingMode: 'hint_ladder', contextStrategy: null });
    });

    it('returns empty flags when no flags set for learner', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);
      vi.mocked(brainServer.readStoredSettingValue).mockResolvedValueOnce(
        JSON.stringify({})
      );

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments');
      const res = await GET_handler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.experimentFlags).toEqual({ coachingMode: null, contextStrategy: null });
    });
  });

  describe('PUT_handler', () => {
    it('updates coaching mode experiment flag', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);
      vi.mocked(brainServer.readStoredSettingValue).mockResolvedValueOnce(
        JSON.stringify({
          'learner-456': { enabled: true, experimentFlags: { coachingMode: null, contextStrategy: null } },
        })
      );
      vi.mocked(brainServer.upsertStoredSettingValue).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments', {
        method: 'PUT',
        body: JSON.stringify({ coachingMode: 'misconception_check' }),
      });

      const res = await PUT_handler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.experimentFlags.coachingMode).toBe('misconception_check');
      expect(vi.mocked(brainServer.upsertStoredSettingValue)).toHaveBeenCalled();
    });

    it('updates context strategy experiment flag', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);
      vi.mocked(brainServer.readStoredSettingValue).mockResolvedValueOnce(
        JSON.stringify({
          'learner-456': { enabled: true, experimentFlags: { coachingMode: null, contextStrategy: null } },
        })
      );
      vi.mocked(brainServer.upsertStoredSettingValue).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments', {
        method: 'PUT',
        body: JSON.stringify({ contextStrategy: 'no_kg' }),
      });

      const res = await PUT_handler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.experimentFlags.contextStrategy).toBe('no_kg');
    });

    it('rejects invalid coaching mode variant', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments', {
        method: 'PUT',
        body: JSON.stringify({ coachingMode: 'invalid_mode' }),
      });

      const res = await PUT_handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid context strategy variant', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments', {
        method: 'PUT',
        body: JSON.stringify({ contextStrategy: 'invalid_strategy' }),
      });

      const res = await PUT_handler(req);
      expect(res.status).toBe(400);
    });

    it('preserves existing flags when updating partial flags', async () => {
      vi.mocked(kangurAuth.resolveKangurActor).mockResolvedValueOnce(mockActor);
      vi.mocked(kangurAuth.requireActiveLearner).mockReturnValueOnce(mockLearner);
      vi.mocked(brainServer.readStoredSettingValue).mockResolvedValueOnce(
        JSON.stringify({
          'learner-456': {
            enabled: true,
            experimentFlags: { coachingMode: 'hint_ladder', contextStrategy: 'no_kg' },
          },
        })
      );
      vi.mocked(brainServer.upsertStoredSettingValue).mockResolvedValueOnce(true);

      const req = new NextRequest('http://localhost:3000/api/kangur/ai-tutor/experiments', {
        method: 'PUT',
        body: JSON.stringify({ coachingMode: 'misconception_check' }),
      });

      const res = await PUT_handler(req);
      const json = await res.json();

      expect(json.experimentFlags.coachingMode).toBe('misconception_check');
      expect(json.experimentFlags.contextStrategy).toBe('no_kg');
    });
  });
});
