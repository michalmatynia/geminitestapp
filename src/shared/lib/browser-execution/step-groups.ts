import type { StepId } from './step-registry';

export const STEP_GROUPS = {
  BROWSER:         ['browser_preparation', 'browser_open'] satisfies StepId[],
  AUTH:            ['cookie_accept', 'auth_check', 'auth_login', 'auth_manual'] satisfies StepId[],

  // Fields shared across Tradera quicklist and Vinted
  LISTING_FIELDS:  ['image_upload', 'title_fill', 'description_fill', 'price_set'] satisfies StepId[],

  // Full Tradera listing form — matches the actual form fill order:
  // images → title → description → format → price → category → attributes → shipping
  TRADERA_FORM:    [
    'image_upload',
    'title_fill',
    'description_fill',
    'listing_format_select',
    'price_set',
    'category_select',
    'attribute_select',
    'shipping_set',
  ] satisfies StepId[],

  // Extra fields Vinted requires beyond the shared listing fields
  VINTED_EXTRAS:   ['category_select', 'brand_fill', 'condition_set', 'size_set'] satisfies StepId[],

  PUBLISH:         ['publish', 'publish_verify', 'browser_close'] satisfies StepId[],
} as const;

export const BROWSER_AND_AUTH: StepId[] = [
  ...STEP_GROUPS.BROWSER,
  ...STEP_GROUPS.AUTH,
];
