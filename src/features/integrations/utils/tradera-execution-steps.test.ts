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

    expect(steps.map((step) => step.id)).toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
      'duplicate_check',
      'deep_duplicate_check',
      'sell_page_open',
      'image_cleanup',
      'image_upload',
      'title_fill',
      'description_fill',
      'listing_format_select',
      'price_set',
      'category_select',
      'attribute_select',
      'shipping_set',
      'publish',
      'publish_verify',
      'browser_close',
    ]);
    expect(steps.map((step) => step.status)).toEqual([
      'success',
      'success',
      'success',
      'success',
      'skipped',
      'skipped',
      'success',
      'skipped',
      'success',
      'success',
      'success',
      'success',
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

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
    });
    expect(steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'skipped',
    });
    expect(steps.find((step) => step.id === 'sell_page_open')).toMatchObject({
      status: 'skipped',
    });
    expect(steps.find((step) => step.id === 'publish_verify')).toMatchObject({
      status: 'skipped',
    });
  });

  it('describes exact-title relinked duplicates distinctly in the quicklist timeline', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'relist',
      rawResult: {
        stage: 'duplicate_linked',
        duplicateLinked: true,
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.linked {"listingUrl":"https://www.tradera.com/item/1"}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Relist linked the single exact-title Tradera candidate instead of creating a new listing.',
    });
    expect(steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'skipped',
      message:
        'Skipped because a single exact-title candidate was enough to link the Tradera listing.',
    });
  });

  it('treats duplicate match strategy as linked state even when duplicateLinked is missing', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'relist',
      rawResult: {
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Relist linked the single exact-title Tradera candidate instead of creating a new listing.',
    });
    expect(steps.find((step) => step.id === 'sell_page_open')).toMatchObject({
      status: 'skipped',
    });
  });

  it('tracks manual auth separately from the stored-session check', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'relist',
      rawResult: {
        stage: 'duplicate_checked',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":false}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
    });

    expect(steps.find((step) => step.id === 'auth_check')).toMatchObject({
      status: 'success',
      message: 'Stored Tradera session check completed and required login recovery.',
    });
    expect(steps.find((step) => step.id === 'auth_login')).toMatchObject({
      status: 'success',
      message: 'Automated login succeeded.',
    });
    expect(steps.find((step) => step.id === 'auth_manual')).toMatchObject({
      status: 'skipped',
      message: 'Automated login succeeded; manual login was not needed.',
    });
  });

  it('explains when non-exact title rows were ignored by duplicate search', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'duplicate_checked',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.search {"candidateCount":0}',
        '[user] tradera.quicklist.duplicate.non_exact_ignored {"fallbackCandidateCount":3,"ignoredCandidateTitles":["Katanas","Katana Sword","Japanese Blades"]}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 3 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades.',
    });
    expect(steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'skipped',
      message: 'Skipped because only non-exact title matches were found.',
    });
  });

  it('uses persisted raw-result duplicate-ignore diagnostics when logs are unavailable', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'duplicate_checked',
        duplicateIgnoredNonExactCandidateCount: 2,
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 2 non-exact title match(es); deep inspection only runs on exact title matches.',
    });
    expect(steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'skipped',
      message: 'Skipped because only non-exact title matches were found.',
    });
  });

  it('uses persisted raw-result ignored titles when duplicate-ignore logs are unavailable', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'duplicate_checked',
        duplicateIgnoredNonExactCandidateCount: 2,
        duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 2 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword.',
    });
  });

  it('shows when ignored duplicate titles were truncated in the step summary', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'duplicate_checked',
        duplicateIgnoredNonExactCandidateCount: 5,
        duplicateIgnoredCandidateTitles: [
          'Katanas',
          'Katana Sword',
          'Japanese Blades',
          'Wooden Katana',
          'Samurai Replica',
        ],
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
    });

    expect(steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
    });
  });

  it('maps duplicate inspection failures onto duplicate_inspect', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'relist',
      rawResult: {
        stage: 'duplicate_checked',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.inspect {"listingId":"123"}',
      ],
      errorMessage:
        'FAIL_DUPLICATE_UNCERTAIN: Duplicate inspection failed for Tradera listing 123.',
    });

    expect(steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'error',
      message:
        'FAIL_DUPLICATE_UNCERTAIN: Duplicate inspection failed for Tradera listing 123.',
    });
    expect(steps.find((step) => step.id === 'sell_page_open')).toMatchObject({
      status: 'skipped',
    });
  });

  it('maps category failures onto category_mapping', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'fields_filled',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
        '[user] tradera.quicklist.sell_page.entry_point {"url":"https://www.tradera.com/en/selling/new"}',
        '[user] tradera.quicklist.image.upload_start {"fileCount":2}',
        '[user] tradera.quicklist.field.verified {"field":"title"}',
      ],
      errorMessage:
        'FAIL_CATEGORY_SET: Tradera mapped category could not be selected in the listing form.',
    });

    expect(steps.find((step) => step.id === 'category_select')).toMatchObject({
      status: 'error',
      message:
        'FAIL_CATEGORY_SET: Tradera mapped category could not be selected in the listing form.',
    });
    expect(steps.find((step) => step.id === 'shipping_set')).toMatchObject({
      status: 'skipped',
    });
  });

  it('keeps listing format and listing attributes as separate quicklist phases', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'sync',
      rawResult: {
        stage: 'category_selected',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"sync"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.sync.editor_opened {"listingUrl":"https://www.tradera.com/item/1"}',
        '[user] tradera.quicklist.image.skipped {"reason":"sync-skip-images"}',
        '[user] tradera.quicklist.field.verified {"field":"title"}',
        '[user] tradera.quicklist.listing_format.inferred {"mode":"buy_now"}',
        '[user] tradera.quicklist.category.search_result {"path":"Collectibles > Pins"}',
      ],
    });

    expect(steps.find((step) => step.id === 'listing_format_select')).toMatchObject({
      status: 'success',
      message: 'Listing format was selected.',
    });
    expect(steps.find((step) => step.id === 'price_set')).toMatchObject({
      status: 'success',
      message: 'Price was set.',
    });
    expect(steps.find((step) => step.id === 'category_select')).toMatchObject({
      status: 'success',
      message: 'Category was selected.',
    });
    expect(steps.find((step) => step.id === 'attribute_select')).toMatchObject({
      status: 'pending',
    });
  });

  it('maps extra field failures onto listing_attributes', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'category_selected',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
        '[user] tradera.quicklist.sell_page.entry_point {"url":"https://www.tradera.com/en/selling/new"}',
        '[user] tradera.quicklist.image.upload_start {"fileCount":2}',
        '[user] tradera.quicklist.listing_format.inferred {"mode":"buy_now"}',
        '[user] tradera.quicklist.category.search_result {"path":"Collectibles > Pins"}',
      ],
      errorMessage:
        'FAIL_EXTRA_FIELD_SET: Required Tradera option "Condition" was not available.',
    });

    expect(steps.find((step) => step.id === 'attribute_select')).toMatchObject({
      status: 'error',
      message:
        'FAIL_EXTRA_FIELD_SET: Required Tradera option "Condition" was not available.',
    });
    expect(steps.find((step) => step.id === 'shipping_set')).toMatchObject({
      status: 'skipped',
    });
  });

  it('maps post-click publish validation failures onto publish_verify', () => {
    const steps = buildTraderaQuicklistExecutionSteps({
      action: 'list',
      rawResult: {
        stage: 'publish_clicked',
      },
      logs: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.auth.final {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
        '[user] tradera.quicklist.sell_page.entry_point {"url":"https://www.tradera.com/en/selling/new"}',
        '[user] tradera.quicklist.image.upload_start {"fileCount":2}',
        '[user] tradera.quicklist.field.verified {"field":"title"}',
        '[user] tradera.quicklist.category.search_result {"path":"Collectibles > Pins"}',
        '[user] tradera.quicklist.delivery.save.applied {"shippingCondition":"Buyer pays shipping"}',
        '[user] tradera.quicklist.publish.click_result {"clicked":true}',
      ],
      errorMessage: 'FAIL_PUBLISH_VALIDATION: Publish action is disabled.',
    });

    expect(steps.find((step) => step.id === 'publish')).toMatchObject({
      status: 'success',
      message: 'The publish action was submitted successfully.',
    });
    expect(steps.find((step) => step.id === 'publish_verify')).toMatchObject({
      status: 'error',
      message: 'FAIL_PUBLISH_VALIDATION: Publish action is disabled.',
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
                id: 'auth_check',
                label: 'Validate Tradera session',
                status: 'success',
                message: 'Stored Tradera session could access the seller overview.',
              },
              {
                id: 'overview_open',
                label: 'Open seller overview',
                status: 'success',
                message: 'Tradera seller overview opened successfully.',
              },
              {
                id: 'resolve_status',
                label: 'Resolve Status',
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
    expect(execution.steps).toHaveLength(3);
  });

  it('reads legacy emitted step payloads that still use completed statuses and info messages', () => {
    expect(
      readTraderaExecutionSteps([
        {
          id: 'publish_verify',
          label: 'Verify published listing',
          status: 'completed',
          info: {
            message: 'The listing was published and verified successfully.',
          },
        },
        {
          id: 'attribute_select',
          label: 'Apply listing attributes',
          status: 'failed',
          info: {
            error: 'FAIL_EXTRA_FIELD_SET: Required Tradera option "Condition" was not available.',
          },
        },
      ])
    ).toEqual([
      {
        id: 'publish_verify',
        label: 'Verify published listing',
        status: 'success',
        message: 'The listing was published and verified successfully.',
      },
      {
        id: 'attribute_select',
        label: 'Apply listing attributes',
        status: 'error',
        message: 'FAIL_EXTRA_FIELD_SET: Required Tradera option "Condition" was not available.',
      },
    ]);
  });

  it('derives quicklist execution steps from raw result and log tail when persisted steps are missing', () => {
    const execution = resolveTraderaExecutionStepsFromMarketplaceData({
      tradera: {
        lastExecution: {
          action: 'list',
          ok: false,
          error: 'FAIL_CATEGORY_SET: Tradera category could not be selected.',
          metadata: {
            rawResult: {
              stage: 'draft_cleared',
            },
            logTail: [
              '[user] tradera.quicklist.start {"listingAction":"list"}',
              '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
              '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
              '[user] tradera.quicklist.image.initial_cleanup {"draftImageRemoveControls":0}',
            ],
          },
        },
      },
    });

    expect(execution.action).toBe('list');
    expect(execution.ok).toBe(false);
    expect(execution.steps.find((step) => step.id === 'auth_check')).toMatchObject({
      status: 'success',
    });
    expect(execution.steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
    });
    expect(execution.steps.find((step) => step.id === 'image_cleanup')).toMatchObject({
      status: 'success',
    });
    expect(execution.steps.find((step) => step.id === 'category_select')).toMatchObject({
      status: 'error',
      message: 'FAIL_CATEGORY_SET: Tradera category could not be selected.',
    });
  });

  it('derives exact-title duplicate-ignore messaging from persisted marketplace metadata', () => {
    const execution = resolveTraderaExecutionStepsFromMarketplaceData({
      tradera: {
        lastExecution: {
          action: 'list',
          ok: true,
          metadata: {
            rawResult: {
              stage: 'duplicate_checked',
              duplicateIgnoredNonExactCandidateCount: 5,
              duplicateIgnoredCandidateTitles: [
                'Katanas',
                'Katana Sword',
                'Japanese Blades',
                'Wooden Katana',
                'Samurai Replica',
              ],
            },
            logTail: [
              '[user] tradera.quicklist.start {"listingAction":"list"}',
              '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
              '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
            ],
          },
        },
      },
    });

    expect(execution.action).toBe('list');
    expect(execution.ok).toBe(true);
    expect(execution.steps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
    });
    expect(execution.steps.find((step) => step.id === 'deep_duplicate_check')).toMatchObject({
      status: 'skipped',
      message: 'Skipped because only non-exact title matches were found.',
    });
  });
});
