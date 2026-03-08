import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initializeQueues, __testOnly } from '@/features/jobs/queue-init';
import * as redisConnection from '@/shared/lib/queue/redis-connection';
import * as registry from '@/shared/lib/queue/registry';

const redisConnectMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const redisPingMock = vi.hoisted(() => vi.fn().mockResolvedValue('PONG'));
const redisDisconnectMock = vi.hoisted(() => vi.fn());
const RedisMock = vi.hoisted(() =>
  vi.fn(function MockRedis(this: {
    on: ReturnType<typeof vi.fn>;
    connect: typeof redisConnectMock;
    ping: typeof redisPingMock;
    disconnect: typeof redisDisconnectMock;
  }) {
    this.on = vi.fn();
    this.connect = redisConnectMock;
    this.ping = redisPingMock;
    this.disconnect = redisDisconnectMock;
  })
);

vi.mock('ioredis', () => ({
  Redis: RedisMock,
}));

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
vi.mock('@/shared/lib/observability/workers/systemLogAlertsQueue', () => ({ startSystemLogAlertsQueue: vi.fn() }));
vi.mock('@/features/ai/insights/workers/aiInsightsQueue', () => ({ startAiInsightsQueue: vi.fn() }));
vi.mock('@/features/products/server', () => ({}));
vi.mock('@/features/ai/server', () => ({
  startAgentQueue: vi.fn(),
  startAiInsightsQueue: vi.fn(),
  startAiPathRunQueue: vi.fn(),
  startChatbotJobQueue: vi.fn(),
  startImageStudioRunQueue: vi.fn(),
  startImageStudioSequenceQueue: vi.fn(),
}));
vi.mock('@/features/integrations/server', () => ({
  startTraderaRelistSchedulerQueue: vi.fn(),
}));
vi.mock('@/features/product-sync/server', () => ({
  startProductSyncSchedulerQueue: vi.fn(),
}));
vi.mock('@/features/case-resolver/server', () => ({
  startCaseResolverOcrQueue: vi.fn(),
}));

describe('queue-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DISABLE_QUEUE_WORKERS'];
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    delete process.env['REDIS_TLS'];
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
      }, { timeout: 5_000 });
    });

    it('should only initialize once', async () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);

      initializeQueues();
      initializeQueues();
      initializeQueues();

      await vi.waitFor(() => {
        expect(registry.startAllWorkers).toHaveBeenCalledTimes(1);
      }, { timeout: 5_000 });
    });
  });
});
