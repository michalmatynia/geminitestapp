import { describe, expect, it } from 'vitest';

import {
  buildTraderaQuicklistExecutionSteps,
  readTraderaExecutionSteps,
  resolveTraderaExecutionStepsFromMarketplaceData,
} from './tradera-execution-steps';

describe('tradera-execution-steps', () => {
  it('builds a successful quicklist step timeline from scripted logs and final stage', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'relist',
      rawResult: {
        stage: 'publish_verified',
        publishVerified: true,
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
        '[user] tradera.quicklist.sell_page.entry_point {"url":"https://www.tradera.com/en/selling/new"}',
        '[user] tradera.quicklist.image.upload_start {"fileCount":3}',
        '[user] tradera.quicklist.field.verified {"field":"title"}',
        '[user] tradera.quicklist.category.search_result {"path":"Collectibles > Pins"}',
        '[user] tradera.quicklist.delivery.save.applied {"shippingCondition":"Buyer pays shipping"}',
        '[user] tradera.quicklist.publish.click_result {"clicked":true}',
      ],
    });

    expect(steps.map((step) => step.status)).toEqual([
      'success',
      'success',
      'success',
      'success',
      'success',
      'success',
      'success',
      'success',
      'success',
    ]);
  });

  it('marks later quicklist steps as skipped when an existing duplicate listing is reused', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'duplicate_linked',
        duplicateLinked: true,
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.linked {"listingUrl":"https://www.tradera.com/item/1"}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate')).toMatchObject({
      status: 'success',
    });
    expect(steps.find((step) => step.id === 'editor')).toMatchObject({
      status: 'skipped',
    });
    expect(steps.find((step) => step.id === 'publish')).toMatchObject({
      status: 'skipped',
    });
  });

  it('reads persisted execution steps from marketplace metadata safely', () => {
    const execution = resolveTraderaExecutionStepsFromMarketplaceData({
      tradera: {
        lastExecution: {
          action: 'check_status',
          ok: true,
          metadata: {
            executionSteps: [
              {
                id: 'open_overview',
                label: 'Open Active listings',
                status: 'success',
                message: 'Tradera Active listings opened successfully.',
              },
              {
                id: 'resolve_status',
                label: 'Resolve final Tradera status',
                status: 'success',
                message: 'Resolved Tradera status as active from Active listings with raw tag "active".',
              },
            ],
          },
        },
      },
    });

    expect(execution.action).toBe('check_status');
    expect(execution.ok).toBe(true);
    expect(execution.steps).toEqual(readTraderaExecutionSteps(execution.steps));
    expect(execution.steps).toHaveLength(2);
  });
});
