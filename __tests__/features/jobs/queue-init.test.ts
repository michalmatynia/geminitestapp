import { describe, it, expect, vi, beforeEach } from 'vitest';

import { initializeQueues } from '@/features/jobs/queue-init';
import * as redisConnection from '@/shared/lib/queue/redis-connection';
import * as registry from '@/shared/lib/queue/registry';

vi.mock('@/shared/lib/queue/redis-connection');
vi.mock('@/shared/lib/queue/registry');
vi.mock('@/shared/lib/observability/system-logger');
vi.mock('@/shared/lib/db/services/database-backup-scheduler');

describe('queue-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['DISABLE_QUEUE_WORKERS'];
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

    it('should start workers if Redis is available', () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);

      initializeQueues();

      expect(registry.startAllWorkers).toHaveBeenCalled();
    });

    it('should only initialize once', () => {
      vi.mocked(redisConnection.isRedisAvailable).mockReturnValue(true);

      initializeQueues();
      initializeQueues();
      initializeQueues();

      expect(registry.startAllWorkers).toHaveBeenCalledTimes(1);
    });
  });
});
