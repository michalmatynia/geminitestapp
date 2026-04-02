import { describe, expect, it } from 'vitest';

import {
  createBaseRecoveryContext,
  createTraderaRecoveryContext,
  findTraderaRecoveryListing,
  isBaseQuickExportRecoveryContext,
  isTraderaQuickExportRecoveryContext,
  matchesProductListingsIntegrationScope,
  normalizeProductListingsIntegrationScope,
  readProductListingsRecoveryString,
  resolveTraderaRecoverySource,
  resolveProductListingsRecoveryIdentifiers,
  resolveProductListingsIntegrationScope,
  resolveProductListingsIntegrationScopeLabel,
  resolveTraderaRecoveryMetadata,
  resolveTraderaRecoveryTarget,
} from './product-listings-recovery';

describe('product-listings-recovery', () => {
  it('resolves the explicit filter ahead of recovery-context fallback', () => {
    expect(
      resolveProductListingsIntegrationScope({
        filterIntegrationSlug: 'playwright-programmable',
        recoveryContext: {
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: null,
        },
      })
    ).toBe('playwright-programmable');
  });

  it('falls back to recovery-context scope when no explicit filter is provided', () => {
    expect(
      resolveProductListingsIntegrationScope({
        recoveryContext: {
          source: 'tradera_quick_export_failed',
          integrationSlug: 'tradera',
          status: 'failed',
          runId: null,
        },
      })
    ).toBe('tradera');
  });

  it('matches grouped marketplace aliases consistently', () => {
    expect(matchesProductListingsIntegrationScope('baselinker', 'base')).toBe(true);
    expect(matchesProductListingsIntegrationScope('tradera', 'tradera')).toBe(true);
    expect(matchesProductListingsIntegrationScope('tradera-api', 'tradera')).toBe(true);
    expect(matchesProductListingsIntegrationScope('baselinker', 'tradera')).toBe(false);
    expect(
      matchesProductListingsIntegrationScope(
        'playwright-programmable',
        'playwright-programmable'
      )
    ).toBe(true);
  });

  it('maps scoped labels for the known marketplace groups', () => {
    expect(resolveProductListingsIntegrationScopeLabel('base')).toBe('Base.com');
    expect(resolveProductListingsIntegrationScopeLabel('tradera')).toBe('Tradera');
    expect(resolveProductListingsIntegrationScopeLabel('playwright-programmable')).toBe(
      'Playwright'
    );
  });

  it('normalizes blank values to null', () => {
    expect(normalizeProductListingsIntegrationScope('   ')).toBeNull();
  });

  it('detects grouped quick-export recovery sources consistently', () => {
    expect(
      isBaseQuickExportRecoveryContext({
        source: 'base_quick_export_failed',
        integrationSlug: 'baselinker',
        status: 'failed',
        runId: null,
      })
    ).toBe(true);
    expect(
      isTraderaQuickExportRecoveryContext({
        source: 'tradera_quick_export_auth_required',
        integrationSlug: 'tradera',
        status: 'auth_required',
        runId: null,
      })
    ).toBe(true);
    expect(isTraderaQuickExportRecoveryContext(null)).toBe(false);
  });

  it('builds a normalized Base recovery context object', () => {
    expect(
      createBaseRecoveryContext({
        status: 'failed',
        runId: 'run-base-1',
        requestId: 'job-base-1',
        integrationId: 'integration-base-1',
        connectionId: 'conn-base-1',
      })
    ).toEqual({
      source: 'base_quick_export_failed',
      integrationSlug: 'baselinker',
      status: 'failed',
      runId: 'run-base-1',
      requestId: 'job-base-1',
      integrationId: 'integration-base-1',
      connectionId: 'conn-base-1',
    });
  });

  it('maps Tradera auth-like statuses back to the auth recovery source', () => {
    expect(resolveTraderaRecoverySource('auth_required')).toBe(
      'tradera_quick_export_auth_required'
    );
    expect(resolveTraderaRecoverySource('needs_login')).toBe(
      'tradera_quick_export_auth_required'
    );
    expect(resolveTraderaRecoverySource('tradera_quick_export_auth_required')).toBe(
      'tradera_quick_export_auth_required'
    );
    expect(resolveTraderaRecoverySource('failed')).toBe('tradera_quick_export_failed');
  });

  it('extracts recovery identifiers from the recovery context', () => {
    expect(
      resolveProductListingsRecoveryIdentifiers({
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-1',
        requestId: 'job-tradera-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      })
    ).toEqual({
      requestId: 'job-tradera-1',
      runId: 'run-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(readProductListingsRecoveryString('   ')).toBeNull();
  });

  it('builds a normalized Tradera recovery context object', () => {
    expect(
      createTraderaRecoveryContext({
        status: 'needs_login',
        runId: 'run-tradera-1',
        requestId: 'job-tradera-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      })
    ).toEqual({
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'needs_login',
      runId: 'run-tradera-1',
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('resolves the Tradera recovery target with fallback listing ids', () => {
    expect(
      resolveTraderaRecoveryTarget({
        recoveryContext: {
          source: 'tradera_quick_export_auth_required',
          integrationSlug: 'tradera',
          status: 'auth_required',
          runId: null,
          requestId: 'job-tradera-1',
        },
        fallbackIntegrationId: 'integration-tradera-1',
        fallbackConnectionId: 'conn-tradera-1',
      })
    ).toEqual({
      isRecovery: true,
      requestId: 'job-tradera-1',
      runId: null,
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      canContinue: true,
    });
  });

  it('finds the Tradera recovery listing by queue job first', () => {
    expect(
      findTraderaRecoveryListing(
        [
          {
            id: 'listing-1',
            status: 'failed',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  requestId: 'job-other',
                },
              },
            },
          } as never,
          {
            id: 'listing-2',
            status: 'auth_required',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  requestId: 'job-target',
                },
              },
            },
          } as never,
        ],
        'job-target',
        null
      )?.id
    ).toBe('listing-2');
  });

  it('finds the Tradera recovery listing by run id when queue job is unavailable', () => {
    expect(
      findTraderaRecoveryListing(
        [
          {
            id: 'listing-1',
            status: 'failed',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  metadata: {
                    runId: 'run-other',
                  },
                },
              },
            },
          } as never,
          {
            id: 'listing-2',
            status: 'auth_required',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  metadata: {
                    runId: 'run-target',
                  },
                },
              },
            },
          } as never,
        ],
        null,
        'run-target'
      )?.id
    ).toBe('listing-2');
  });

  it('prefers the freshest failed Tradera listing when recovery ids are unavailable', () => {
    expect(
      findTraderaRecoveryListing(
        [
          {
            id: 'listing-1',
            status: 'failed',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T16:00:00.000Z',
                },
              },
            },
          } as never,
          {
            id: 'listing-2',
            status: 'auth_required',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T18:00:00.000Z',
                },
              },
            },
          } as never,
          {
            id: 'listing-3',
            status: 'active',
            integration: { slug: 'tradera' },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T19:00:00.000Z',
                },
              },
            },
          } as never,
        ],
        null,
        null
      )?.id
    ).toBe('listing-2');
  });

  it('extracts Tradera recovery metadata from listing execution details', () => {
    expect(
      resolveTraderaRecoveryMetadata({
        id: 'listing-1',
        updatedAt: '2026-04-02T18:30:00.000Z',
        createdAt: '2026-04-02T17:00:00.000Z',
        marketplaceData: {
          tradera: {
            lastExecution: {
              requestId: 'job-target',
              executedAt: '2026-04-02T18:00:00.000Z',
              metadata: {
                runId: 'run-target',
              },
            },
          },
        },
      } as never)
    ).toEqual({
      requestId: 'job-target',
      runId: 'run-target',
      executedAt: Date.parse('2026-04-02T18:00:00.000Z'),
      updatedAt: Date.parse('2026-04-02T18:30:00.000Z'),
      createdAt: Date.parse('2026-04-02T17:00:00.000Z'),
    });
  });
});
