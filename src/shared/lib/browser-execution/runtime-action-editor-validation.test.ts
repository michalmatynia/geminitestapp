import { describe, expect, it } from 'vitest';

import type { PlaywrightActionBlock } from '@/shared/contracts/playwright-steps';

import { PLAYWRIGHT_RUNTIME_ACTION_SEEDS } from './playwright-runtime-action-seeds';
import { validateRuntimeActionEditorBlocks } from './runtime-action-editor-validation';

const getSeedBlocks = (runtimeKey: string): PlaywrightActionBlock[] => {
  const action = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find((entry) => entry.runtimeKey === runtimeKey);
  if (action === undefined) {
    throw new Error(`Missing seed action for ${runtimeKey}`);
  }

  return action.blocks.map((block) => ({ ...block }));
};

describe('runtime-action-editor-validation', () => {
  it('accepts the seeded Tradera quicklist list manifest', () => {
    const errors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_list',
      blocks: getSeedBlocks('tradera_quicklist_list'),
    });

    expect(errors).toEqual([]);
  });

  it('rejects publish_verify before publish', () => {
    const blocks = getSeedBlocks('tradera_quicklist_list');
    const publishIndex = blocks.findIndex((block) => block.refId === 'publish');
    const publishVerifyIndex = blocks.findIndex((block) => block.refId === 'publish_verify');
    const [publishVerifyBlock] = blocks.splice(publishVerifyIndex, 1);
    blocks.splice(publishIndex, 0, publishVerifyBlock as PlaywrightActionBlock);

    const errors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_list',
      blocks,
    });

    expect(errors).toContain(
      'Runtime action "tradera_quicklist_list" must place publish_verify after publish.'
    );
  });

  it('rejects form steps after publish', () => {
    const blocks = getSeedBlocks('tradera_quicklist_list');
    const priceIndex = blocks.findIndex((block) => block.refId === 'price_set');
    const [priceBlock] = blocks.splice(priceIndex, 1);
    const publishIndex = blocks.findIndex((block) => block.refId === 'publish');
    blocks.splice(publishIndex + 1, 0, priceBlock as PlaywrightActionBlock);

    const errors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_list',
      blocks,
    });

    expect(errors).toContain(
      'Runtime action "tradera_quicklist_list" cannot place form steps after publish: price_set.'
    );
  });

  it('rejects steps that are outside the sync manifest', () => {
    const blocks = [
      ...getSeedBlocks('tradera_quicklist_sync'),
      {
        id: 'extra_duplicate_check',
        kind: 'runtime_step',
        refId: 'duplicate_check',
        enabled: true,
        label: null,
      } satisfies PlaywrightActionBlock,
    ];

    const errors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_sync',
      blocks,
    });

    expect(errors).toContain(
      'Runtime action "tradera_quicklist_sync" does not allow these steps: duplicate_check.'
    );
  });

  it('requires the editor step for list manifests and the sync step for sync manifests', () => {
    const listErrors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_list',
      blocks: getSeedBlocks('tradera_quicklist_list').filter(
        (block) => block.refId !== 'sell_page_open'
      ),
    });
    const syncErrors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_sync',
      blocks: getSeedBlocks('tradera_quicklist_sync').filter(
        (block) => block.refId !== 'sync_check'
      ),
    });

    expect(listErrors).toContain(
      'Runtime action "tradera_quicklist_list" must include sell_page_open.'
    );
    expect(syncErrors).toContain(
      'Runtime action "tradera_quicklist_sync" must include sync_check.'
    );
  });

  it('rejects non-runtime blocks inside runtime actions', () => {
    const blocks = [
      ...getSeedBlocks('tradera_quicklist_list'),
      {
        id: 'direct_step_block',
        kind: 'step',
        refId: 'custom_step_id',
        enabled: true,
        label: null,
      } satisfies PlaywrightActionBlock,
    ];

    const errors = validateRuntimeActionEditorBlocks({
      runtimeKey: 'tradera_quicklist_list',
      blocks,
    });

    expect(errors).toContain(
      'Runtime action "tradera_quicklist_list" only supports runtime_step blocks. Remove: step.'
    );
  });
});
