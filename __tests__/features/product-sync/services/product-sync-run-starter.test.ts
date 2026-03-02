import { describe, it, expect, vi, beforeEach } from 'vitest';

import { startProductSyncRun } from '@/features/product-sync/services/product-sync-run-starter';
import * as repository from '@/features/product-sync/services/product-sync-repository';
import * as service from '@/features/product-sync/services/product-sync-service';
import * as queue from '@/features/product-sync/workers/productSyncQueue';

vi.mock('@/features/product-sync/services/product-sync-repository');
vi.mock('@/features/product-sync/services/product-sync-service');
vi.mock('@/features/product-sync/workers/productSyncQueue');
vi.mock('@/shared/utils/observability/error-system');

describe('product-sync-run-starter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startProductSyncRun', () => {
    it('should throw error if profile not found', async () => {
      vi.mocked(repository.getProductSyncProfile).mockResolvedValue(null);

      await expect(
        startProductSyncRun({ profileId: 'invalid', trigger: 'manual' })
      ).rejects.toThrow('Sync profile not found.');
    });

    it('should throw error if profile disabled and trigger is scheduled', async () => {
      vi.mocked(repository.getProductSyncProfile).mockResolvedValue({
        id: 'profile-1',
        enabled: false,
      } as any);

      await expect(
        startProductSyncRun({ profileId: 'profile-1', trigger: 'scheduled' })
      ).rejects.toThrow('Sync profile is disabled.');
    });

    it('should allow manual trigger even if profile disabled', async () => {
      vi.mocked(repository.getProductSyncProfile).mockResolvedValue({
        id: 'profile-1',
        enabled: false,
      } as any);
      vi.mocked(repository.recoverStaleProductSyncRuns).mockResolvedValue({
        recoveredRuns: 0,
        recoveredQueuedRuns: 0,
        recoveredRunningRuns: 0,
      });
      vi.mocked(repository.hasActiveProductSyncRun).mockResolvedValue(false);
      vi.mocked(repository.createProductSyncRun).mockResolvedValue({
        id: 'run-1',
        profileId: 'profile-1',
        status: 'queued',
      } as any);
      vi.mocked(repository.pruneProductSyncRunsForProfile).mockResolvedValue(undefined);
      vi.mocked(queue.enqueueProductSyncRunJob).mockResolvedValue('job-1');
      vi.mocked(service.assignQueueJobToProductSyncRun).mockResolvedValue({
        id: 'run-1',
        profileId: 'profile-1',
        status: 'queued',
      } as any);

      const result = await startProductSyncRun({ profileId: 'profile-1', trigger: 'manual' });

      expect(result.id).toBe('run-1');
    });

    it('should throw error if active run already exists', async () => {
      vi.mocked(repository.getProductSyncProfile).mockResolvedValue({
        id: 'profile-1',
        enabled: true,
      } as any);
      vi.mocked(repository.recoverStaleProductSyncRuns).mockResolvedValue({
        recoveredRuns: 0,
        recoveredQueuedRuns: 0,
        recoveredRunningRuns: 0,
      });
      vi.mocked(repository.hasActiveProductSyncRun).mockResolvedValue(true);

      await expect(
        startProductSyncRun({ profileId: 'profile-1', trigger: 'manual' })
      ).rejects.toThrow('A sync run is already queued or running for this profile.');
    });

    it('should create and enqueue sync run successfully', async () => {
      vi.mocked(repository.getProductSyncProfile).mockResolvedValue({
        id: 'profile-1',
        enabled: true,
      } as any);
      vi.mocked(repository.recoverStaleProductSyncRuns).mockResolvedValue({
        recoveredRuns: 0,
        recoveredQueuedRuns: 0,
        recoveredRunningRuns: 0,
      });
      vi.mocked(repository.hasActiveProductSyncRun).mockResolvedValue(false);
      vi.mocked(repository.createProductSyncRun).mockResolvedValue({
        id: 'run-1',
        profileId: 'profile-1',
        status: 'queued',
      } as any);
      vi.mocked(repository.pruneProductSyncRunsForProfile).mockResolvedValue(undefined);
      vi.mocked(queue.enqueueProductSyncRunJob).mockResolvedValue('job-1');
      vi.mocked(service.assignQueueJobToProductSyncRun).mockResolvedValue({
        id: 'run-1',
        profileId: 'profile-1',
        status: 'queued',
      } as any);

      const result = await startProductSyncRun({ profileId: 'profile-1', trigger: 'manual' });

      expect(result.id).toBe('run-1');
      expect(repository.createProductSyncRun).toHaveBeenCalledWith({
        profileId: 'profile-1',
        trigger: 'manual',
      });
      expect(queue.enqueueProductSyncRunJob).toHaveBeenCalledWith({ runId: 'run-1', profileId: 'profile-1', trigger: 'manual' });
    });
  });
});
