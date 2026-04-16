import { describe, expect, it, vi } from 'vitest';

import {
  finalizePlaywrightListingJobFailure,
  finalizePlaywrightListingStatusCheckOutcome,
  finalizePlaywrightListingJobSuccess,
  finalizePlaywrightStandardListingJobOutcome,
} from './listing-job';

describe('playwright listing job helpers', () => {
  it('applies a shared success path with optional status transition', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };

    await finalizePlaywrightListingJobSuccess({
      repository,
      listingId: 'listing-1',
      transitionStatus: 'active',
      update: {
        failureReason: null,
      },
      history: {
        exportedAt: new Date('2026-04-10T12:00:00.000Z'),
        status: 'active',
        relist: false,
        requestId: 'job-1',
      },
    });

    expect(repository.updateListingStatus).toHaveBeenCalledWith('listing-1', 'active');
    expect(repository.updateListing).toHaveBeenCalledWith('listing-1', {
      failureReason: null,
    });
    expect(repository.appendExportHistory).toHaveBeenCalledWith('listing-1', {
      exportedAt: new Date('2026-04-10T12:00:00.000Z'),
      status: 'active',
      relist: false,
      requestId: 'job-1',
    });
  });

  it('applies a shared failure path and rethrows the provided message', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };

    await expect(
      finalizePlaywrightListingJobFailure({
        repository,
        listingId: 'listing-2',
        transitionStatus: 'failed',
        update: {
          failureReason: 'selector missing',
        },
        history: {
          exportedAt: new Date('2026-04-10T12:00:00.000Z'),
          status: 'failed',
          relist: true,
          requestId: 'job-2',
        },
        errorMessage: 'selector missing',
      })
    ).rejects.toThrow('selector missing');

    expect(repository.updateListingStatus).toHaveBeenCalledWith('listing-2', 'failed');
    expect(repository.updateListing).toHaveBeenCalledWith('listing-2', {
      failureReason: 'selector missing',
    });
    expect(repository.appendExportHistory).toHaveBeenCalledWith('listing-2', {
      exportedAt: new Date('2026-04-10T12:00:00.000Z'),
      status: 'failed',
      relist: true,
      requestId: 'job-2',
    });
  });

  it('does not require a status transition for passive providers', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };

    await finalizePlaywrightListingJobSuccess({
      repository,
      listingId: 'listing-3',
      update: {
        status: 'active',
      },
      history: {
        exportedAt: new Date('2026-04-10T12:00:00.000Z'),
        status: 'active',
        relist: false,
        requestId: null,
      },
    });

    expect(repository.updateListingStatus).not.toHaveBeenCalled();
    expect(repository.updateListing).toHaveBeenCalledWith('listing-3', {
      status: 'active',
    });
    expect(repository.appendExportHistory).toHaveBeenCalled();
  });

  it('applies the shared standard outcome success path', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };

    await finalizePlaywrightStandardListingJobOutcome({
      repository,
      listingId: 'listing-4',
      result: {
        ok: true,
        externalListingId: 'external-4',
        error: null,
        errorCategory: null,
      },
      at: new Date('2026-04-10T12:00:00.000Z'),
      marketplaceData: {
        marketplace: 'playwright-programmable',
      },
      relist: true,
      requestId: 'job-4',
      historyFields: ['browser_mode:headed'],
      success: {
        transitionStatus: 'active',
        historyStatus: 'active',
        expiresAt: new Date('2026-04-12T12:00:00.000Z'),
        updateExtra: {
          listedAt: new Date('2026-04-10T12:00:00.000Z'),
        },
      },
      failure: {
        transitionStatus: 'failed',
        historyStatus: 'failed',
        failureReason: 'should not be used',
      },
    });

    expect(repository.updateListingStatus).toHaveBeenCalledWith('listing-4', 'active');
    expect(repository.updateListing).toHaveBeenCalledWith(
      'listing-4',
      expect.objectContaining({
        externalListingId: 'external-4',
        failureReason: null,
        marketplaceData: {
          marketplace: 'playwright-programmable',
        },
      })
    );
    expect(repository.appendExportHistory).toHaveBeenCalledWith(
      'listing-4',
      expect.objectContaining({
        status: 'active',
        externalListingId: 'external-4',
        relist: true,
        requestId: 'job-4',
        fields: ['browser_mode:headed'],
      })
    );
  });

  it('applies the shared standard outcome failure path and throws', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };

    await expect(
      finalizePlaywrightStandardListingJobOutcome({
        repository,
        listingId: 'listing-5',
        result: {
          ok: false,
          externalListingId: null,
          error: 'selector missing',
          errorCategory: 'EXECUTION_FAILED',
        },
        at: new Date('2026-04-10T12:00:00.000Z'),
        marketplaceData: {
          marketplace: 'vinted',
        },
        relist: false,
        requestId: 'job-5',
        historyFields: ['browser_mode:headless'],
        success: {
          historyStatus: 'active',
        },
        failure: {
          transitionStatus: 'failed',
          historyStatus: 'failed',
          failureReason: 'Vinted listing failed.',
          updateExtra: {
            status: 'failed',
          },
        },
      })
    ).rejects.toThrow('selector missing');

    expect(repository.updateListingStatus).toHaveBeenCalledWith('listing-5', 'failed');
    expect(repository.updateListing).toHaveBeenCalledWith(
      'listing-5',
      expect.objectContaining({
        failureReason: 'selector missing',
        marketplaceData: {
          marketplace: 'vinted',
        },
        status: 'failed',
      })
    );
    expect(repository.appendExportHistory).toHaveBeenCalledWith(
      'listing-5',
      expect.objectContaining({
        status: 'failed',
        failureReason: 'selector missing',
        relist: false,
        requestId: 'job-5',
        fields: ['browser_mode:headless'],
      })
    );
  });

  it('applies the shared status-check success path without export history', async () => {
    const repository = {
      updateListing: vi.fn(),
    };

    await finalizePlaywrightListingStatusCheckOutcome({
      repository,
      listingId: 'listing-6',
      result: {
        ok: true,
        error: null,
      },
      at: new Date('2026-04-10T12:00:00.000Z'),
      marketplaceData: {
        marketplace: 'tradera',
      },
      statusOnSuccess: 'ended',
      failureMessage: 'should not be used',
    });

    expect(repository.updateListing).toHaveBeenCalledWith('listing-6', {
      status: 'ended',
      lastStatusCheckAt: new Date('2026-04-10T12:00:00.000Z'),
      marketplaceData: {
        marketplace: 'tradera',
      },
    });
  });

  it('applies the shared status-check failure path and rethrows', async () => {
    const repository = {
      updateListing: vi.fn(),
    };

    await expect(
      finalizePlaywrightListingStatusCheckOutcome({
        repository,
        listingId: 'listing-7',
        result: {
          ok: false,
          error: 'status scrape failed',
        },
        at: new Date('2026-04-10T12:00:00.000Z'),
        marketplaceData: {
          marketplace: 'tradera',
        },
        failureMessage: 'Tradera live status check failed.',
      })
    ).rejects.toThrow('status scrape failed');

    expect(repository.updateListing).toHaveBeenCalledWith('listing-7', {
      lastStatusCheckAt: new Date('2026-04-10T12:00:00.000Z'),
      marketplaceData: {
        marketplace: 'tradera',
      },
    });
  });
});
