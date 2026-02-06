import { promises as fs } from 'fs';

import { vi, describe, it, expect, beforeEach } from 'vitest';

import { captureSessionContext, captureSnapshot } from '@/features/ai/agent-runtime/tools/playwright/browser';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentAuditLog: { create: vi.fn() },
    agentBrowserSnapshot: { create: vi.fn() },
  },
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  return {
    ...actual,
    promises: {
      writeFile: mockWriteFile,
    },
    default: {
      promises: {
        writeFile: mockWriteFile,
      },
    },
  };
});

const mockPage = {
  url: vi.fn().mockReturnValue('http://test.com'),
  title: vi.fn().mockResolvedValue('Test Title'),
  evaluate: vi.fn(),
  content: vi.fn().mockResolvedValue('<html></html>'),
  screenshot: vi.fn().mockResolvedValue(Buffer.from('abc')),
  viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
};

const mockContext = {
  cookies: vi.fn().mockResolvedValue([{ name: 'session', value: '123', domain: 'test.com' }]),
};

describe('Agent Runtime - Browser Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureSessionContext', () => {
    it('should extract cookies and storage and log to prisma', async () => {
      mockPage.evaluate.mockResolvedValue({ localCount: 1, sessionCount: 0 });
      
      await captureSessionContext(mockPage as any, mockContext as any, 'run-1', 'init');

      expect(mockContext.cookies).toHaveBeenCalled();
      expect(prisma.agentAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          message: 'Captured session context.',
          metadata: expect.objectContaining({
            label: 'init',
            url: 'http://test.com',
            cookies: expect.any(Array),
          })
        })
      }));
    });
  });

  describe('captureSnapshot', () => {
    it('should take screenshot, get DOM and save to prisma', async () => {
      mockPage.evaluate.mockResolvedValue('DOM Text');
      
      const result = await captureSnapshot(mockPage as any, 'run-1', '/tmp', 'test-label');

      expect(mockPage.screenshot).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(prisma.agentBrowserSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          domText: 'DOM Text',
          title: 'Test Title',
          viewportWidth: 1280,
        })
      }));
      expect(result.domText).toBe('DOM Text');
    });
  });
});
