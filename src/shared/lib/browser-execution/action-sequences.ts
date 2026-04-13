import type { StepId } from './step-registry';
import { BROWSER_AND_AUTH, STEP_GROUPS } from './step-groups';

export type ActionSequenceKey =
  | 'tradera_quicklist_list'
  | 'tradera_quicklist_relist'
  | 'tradera_quicklist_sync'
  | 'tradera_check_status'
  | 'vinted_list'
  | 'vinted_relist'
  | 'vinted_sync';

export const ACTION_SEQUENCES: Record<ActionSequenceKey, readonly StepId[]> = {
  tradera_quicklist_list: [
    ...BROWSER_AND_AUTH,
    'duplicate_check',
    'deep_duplicate_check',
    'sell_page_open',
    'image_cleanup',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_quicklist_relist: [
    ...BROWSER_AND_AUTH,
    'duplicate_check',
    'deep_duplicate_check',
    'sell_page_open',
    'image_cleanup',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_quicklist_sync: [
    ...BROWSER_AND_AUTH,
    'sync_check',
    ...STEP_GROUPS.TRADERA_FORM,
    ...STEP_GROUPS.PUBLISH,
  ],

  tradera_check_status: [
    'browser_open',
    'cookie_accept',
    'auth_check',
    'overview_open',
    'search_active',
    'inspect_active',
    'search_unsold',
    'inspect_unsold',
    'search_sold',
    'inspect_sold',
    'resolve_status',
    'browser_close',
  ],

  vinted_list: [
    ...BROWSER_AND_AUTH,
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],

  vinted_relist: [
    ...BROWSER_AND_AUTH,
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],

  vinted_sync: [
    ...BROWSER_AND_AUTH,
    'sync_check',
    ...STEP_GROUPS.LISTING_FIELDS,
    ...STEP_GROUPS.VINTED_EXTRAS,
    ...STEP_GROUPS.PUBLISH,
  ],
};
