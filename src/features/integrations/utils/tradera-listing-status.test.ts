import { describe, expect, it } from 'vitest';

import {
  resolveDisplayedTraderaListingStatus,
  resolveLatestCheckedTraderaStatusFromMarketplaceData,
  resolvePendingTraderaExecutionAction,
} from './tradera-listing-status';

describe('tradera-listing-status', () => {
  it('reads the pending Tradera execution action from marketplace data', () => {
    expect(
      resolvePendingTraderaExecutionAction({
        tradera: {
          pendingExecution: {
            action: 'sync',
          },
        },
      })
    ).toBe('sync');
  });

  it('resolves the latest checked Tradera status only for status-check executions', () => {
    expect(
      resolveLatestCheckedTraderaStatusFromMarketplaceData({
        tradera: {
          lastExecution: {
            action: 'sync',
            metadata: {
              checkedStatus: 'ended',
            },
          },
        },
      })
    ).toBeNull();

    expect(
      resolveLatestCheckedTraderaStatusFromMarketplaceData({
        tradera: {
          lastExecution: {
            action: 'check_status',
            metadata: {
              checkedStatus: 'ended',
              rawResult: {
                status: 'active',
              },
            },
          },
        },
      })
    ).toBe('ended');
  });

  it('prefers the latest verified Tradera status for display', () => {
    expect(
      resolveDisplayedTraderaListingStatus({
        status: 'active',
        marketplaceData: {
          tradera: {
            lastExecution: {
              action: 'check_status',
              metadata: {
                checkedStatus: 'unsold',
              },
            },
          },
        },
      })
    ).toBe('unsold');
  });

  it('maps queued_relist to queued when the pending action is not a relist', () => {
    expect(
      resolveDisplayedTraderaListingStatus({
        status: 'queued_relist',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'sync',
            },
          },
        },
      })
    ).toBe('queued');

    expect(
      resolveDisplayedTraderaListingStatus({
        status: 'queued_relist',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'relist',
            },
          },
        },
      })
    ).toBe('queued_relist');
  });
});
