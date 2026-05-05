export type RuntimeStepGroup = {
  id: string;
  label: string;
  stepIds: readonly string[];
};

export const RUNTIME_STEP_GROUPS: readonly RuntimeStepGroup[] = [
  {
    id: 'browser_session',
    label: 'Browser & Session',
    stepIds: [
      'browser_preparation',
      'browser_open',
      'browser_close',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
    ],
  },
  {
    id: 'shared_listing',
    label: 'Shared Listing',
    stepIds: [
      'sync_check',
      'image_upload',
      'title_fill',
      'description_fill',
      'price_set',
      'category_select',
    ],
  },
];
