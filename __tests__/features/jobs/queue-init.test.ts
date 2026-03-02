import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initializeQueues, __testOnly } from '@/features/jobs/queue-init';
import * as redisConnection from '@/shared/lib/queue/redis-connection';
import * as registry from '@/shared/lib/queue/registry';

vi.mock('@/shared/lib/queue/redis-connection');
vi.mock('@/shared/lib/queue/registry');
vi.mock('@/shared/lib/observability/system-logger');
vi.mock('@/shared/lib/db/services/database-backup-scheduler');

// Mock dynamic imports
vi.mock('@/features/products/workers/productAiQueue', () => ({}));
vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({ startAiPathRunQueue: vi.fn() }));
vi.mock('@/features/ai/chatbot/workers/chatbotJobQueue', () => ({ startChatbotJobQueue: vi.fn() }));
vi.mock('@/features/ai/agent-runtime/workers/agentQueue', () => ({ startAgentQueue: vi.fn() }));
vi.mock('@/shared/lib/db/workers/databaseBackupSchedulerQueue', () => ({ startDatabaseBackupSchedulerQueue: vi.fn() }));
vi.mock('@/features/ai/image-studio/workers/imageStudioRunQueue', () => ({ startImageStudioRunQueue: vi.fn() }));
vi.mock('@/features/ai/image-studio/workers/imageStudioSequenceQueue', () => ({ startImageStudioSequenceQueue: vi.fn() }));
vi.mock('@/features/integrations/workers/traderaListingQueue', () => ({}));
vi.mock('@/features/integrations/workers/traderaRelistSchedulerQueue', () => ({ startTraderaRelistSchedulerQueue: vi.fn() }));
vi.mock('@/features/integrations/workers/baseImportQueue', () => ({}));
vi.mock('@/features/product-sync/workers/productSyncQueue', () => ({}));
vi.mock('@/features/product-sync/workers/productSyncBackfillQueue', () => ({}));
vi.mock('@/features/product-sync/workers/productSyncSchedulerQueue', () => ({ startProductSyncSchedulerQueue: vi.fn() }));
vi.mock('@/features/case-resolver/workers/caseResolverOcrQueue', () => ({ startCaseResolverOcrQueue: vi.fn() }));
vi.mock('@/features/ai/insights/workers/aiInsightsQueue', () => ({ startAiInsightsQueue: vi.fn() }));

describe('queue-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DISABLE_QUEUE_WORKERS'];
    __testOnly.resetInitialized();
  });

  describe('initializeQueues', () => {
    it('should skip initialization if DISABLE_QUEUE_WORKERS is true', () => {
      process.env['DISABLE_QUEUE_WORKERS'] = 'true';
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(false);

      initializeQueues();

      expect(registry.startAllWorkers).not.toHaveBeenCalled();
    });

    it('should skip initialization if Redis is not available', () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(false);

      initializeQueues();

      expect(registry.startAllWorkers).not.toHaveBeenCalled();
    });

    it('should start workers if Redis is available', async () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);

      initializeQueues();

      await vi.waitFor(() => {
        expect(registry.startAllWorkers).toHaveBeenCalled();
      });
    });

    it('should only initialize once', async () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);

      initializeQueues();
      initializeQueues();
      initializeQueues();

      await vi.waitFor(() => {
        expect(registry.startAllWorkers).toHaveBeenCalledTimes(1);
      });
    });
  });
});
