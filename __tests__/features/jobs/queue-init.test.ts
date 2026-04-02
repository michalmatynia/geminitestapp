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

vi.mock('@/server/queues/product-ai', () => ({
  startProductAiJobQueue: vi.fn(),
}));
vi.mock('@/server/queues/ai', () => ({
  startAgentQueue: vi.fn(),
  startAiInsightsQueue: vi.fn(),
  startAiPathRunQueue: vi.fn(),
  startChatbotJobQueue: vi.fn(),
  startImageStudioRunQueue: vi.fn(),
  startImageStudioSequenceQueue: vi.fn(),
}));
vi.mock('@/shared/lib/db/workers/databaseBackupSchedulerQueue', () => ({
  startDatabaseBackupSchedulerQueue: vi.fn(),
}));
vi.mock('@/server/queues/integrations', () => ({
  startTraderaRelistSchedulerQueue: vi.fn(),
}));
vi.mock('@/server/queues/product-sync', () => ({
  startProductSyncSchedulerQueue: vi.fn(),
}));
vi.mock('@/server/queues/case-resolver-ocr', () => ({
  startCaseResolverOcrQueue: vi.fn(),
}));
vi.mock('@/shared/lib/observability/workers/systemLogAlertsQueue', () => ({
  startSystemLogAlertsQueue: vi.fn(),
}));
vi.mock('@/server/queues/kangur', () => ({
  startKangurSocialSchedulerQueue: vi.fn(),
  startKangurSocialPipelineQueue: vi.fn(),
}));
vi.mock('@/server/queues/filemaker', () => ({
  startFilemakerEmailCampaignQueue: vi.fn(),
  startFilemakerEmailCampaignSchedulerQueue: vi.fn(),
}));

describe('queue-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DISABLE_QUEUE_WORKERS'];
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    delete process.env['REDIS_TLS'];
    __testOnly.resetInitialized();
    vi.mocked(redisConnection.isRedisReachable).mockResolvedValue(false);
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
      vi.mocked(redisConnection.isRedisReachable).mockResolvedValue(true);

      initializeQueues();

      await vi.waitFor(() => {
        expect(registry.startAllWorkers).toHaveBeenCalled();
      }, { timeout: 5_000 });
    });

    it('should only initialize once', async () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);
      vi.mocked(redisConnection.isRedisReachable).mockResolvedValue(true);

      initializeQueues();
      initializeQueues();
      initializeQueues();

      await vi.waitFor(() => {
        expect(registry.startAllWorkers).toHaveBeenCalledTimes(1);
      }, { timeout: 5_000 });
    });
  });
});
