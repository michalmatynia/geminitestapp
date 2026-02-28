import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotAgentRun: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/features/jobs/server', () => ({
  startAgentQueue: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/server', () => ({
  logAgentAudit: vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST, DELETE } from '@/app/api/agentcreator/agent/[runId]/route';
import prisma from '@/shared/lib/db/prisma';

describe('Agent Run [runId] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ctx = { params: Promise.resolve({ runId: 'test-run-123' }) };

  describe('GET', () => {
    it('returns specific agent run', async () => {
      const mockRun = { id: 'test-run-123', prompt: 'test' };
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue(mockRun as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123');
      const res = await GET(req, ctx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.run).toEqual(mockRun);
    });

    it('returns 404 if run not found', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/agentcreator/agent/unknown');
      const res = await GET(req, ctx);
      expect(res.status).toBe(404);
    });
  });

  describe('POST actions', () => {
    it('stops a running agent', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue({
        id: 'test-run-123',
        status: 'running',
      } as any);
      vi.mocked(prisma.chatbotAgentRun.update).mockResolvedValue({
        id: 'test-run-123',
        status: 'stopped',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' }),
      });

      const res = await POST(req, ctx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('stopped');
      expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'stopped' }),
        })
      );
    });

    it('resumes a stopped agent', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue({
        id: 'test-run-123',
        status: 'stopped',
      } as any);
      vi.mocked(prisma.chatbotAgentRun.update).mockResolvedValue({
        id: 'test-run-123',
        status: 'queued',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'resume' }),
      });

      const res = await POST(req, ctx);
      const data = await res.json();

      expect(data.status).toBe('queued');
    });

    it('retries a specific step', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue({
        id: 'test-run-123',
        status: 'failed',
        planState: { steps: [{ id: 'step-1', status: 'failed' }] },
      } as any);
      vi.mocked(prisma.chatbotAgentRun.update).mockResolvedValue({
        id: 'test-run-123',
        status: 'queued',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123', {
        method: 'POST',
        body: JSON.stringify({ action: 'retry_step', stepId: 'step-1' }),
      });

      const res = await POST(req, ctx);
      expect(res.status).toBe(200);
      expect(prisma.chatbotAgentRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activeStepId: 'step-1',
            status: 'queued',
          }),
        })
      );
    });
  });

  describe('DELETE', () => {
    it('deletes a non-running agent', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue({
        id: 'test-run-123',
        status: 'completed',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123', {
        method: 'DELETE',
      });

      const res = await DELETE(req, ctx);
      expect(res.status).toBe(200);
      expect(prisma.chatbotAgentRun.delete).toHaveBeenCalled();
    });

    it('returns 409 when trying to delete a running agent without force', async () => {
      vi.mocked(prisma.chatbotAgentRun.findUnique).mockResolvedValue({
        id: 'test-run-123',
        status: 'running',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent/test-run-123', {
        method: 'DELETE',
      });

      const res = await DELETE(req, ctx);
      expect(res.status).toBe(409);
    });
  });
});
