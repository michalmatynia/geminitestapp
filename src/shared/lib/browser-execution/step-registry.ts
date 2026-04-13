export const STEP_REGISTRY = {
  // Browser lifecycle
  browser_preparation:    { id: 'browser_preparation',    label: 'Browser preparation' },
  browser_open:           { id: 'browser_open',           label: 'Open browser' },
  browser_close:          { id: 'browser_close',          label: 'Close browser' },

  // Cookie / consent
  cookie_accept:          { id: 'cookie_accept',          label: 'Accept cookies' },

  // Auth
  auth_check:             { id: 'auth_check',             label: 'Validate session' },
  auth_login:             { id: 'auth_login',             label: 'Automated login' },
  auth_manual:            { id: 'auth_manual',            label: 'Manual login' },

  // Tradera quicklist — sync path
  sync_check:             { id: 'sync_check',             label: 'Load sync target' },

  // Tradera quicklist — list/relist path
  duplicate_check:        { id: 'duplicate_check',        label: 'Duplicate check' },
  deep_duplicate_check:   { id: 'deep_duplicate_check',   label: 'Deep duplicate check' },
  sell_page_open:         { id: 'sell_page_open',         label: 'Open listing editor' },
  image_cleanup:          { id: 'image_cleanup',          label: 'Clear draft images' },

  // Tradera check_status path
  overview_open:          { id: 'overview_open',          label: 'Open Tradera overview' },
  search_active:          { id: 'search_active',          label: 'Search active listings' },
  inspect_active:         { id: 'inspect_active',         label: 'Inspect active candidate' },
  search_unsold:          { id: 'search_unsold',          label: 'Search unsold items' },
  inspect_unsold:         { id: 'inspect_unsold',         label: 'Inspect unsold candidate' },
  search_sold:            { id: 'search_sold',            label: 'Search sold items' },
  inspect_sold:           { id: 'inspect_sold',           label: 'Inspect sold candidate' },
  resolve_status:         { id: 'resolve_status',         label: 'Resolve listing status' },

  // Listing fields — shared
  image_upload:           { id: 'image_upload',           label: 'Upload images' },
  title_fill:             { id: 'title_fill',             label: 'Enter title' },
  description_fill:       { id: 'description_fill',       label: 'Enter description' },
  price_set:              { id: 'price_set',              label: 'Set price' },

  // Tradera-specific listing fields
  category_select:        { id: 'category_select',        label: 'Select category' },
  listing_format_select:  { id: 'listing_format_select',  label: 'Select listing format' },
  attribute_select:       { id: 'attribute_select',       label: 'Set listing attributes' },
  shipping_set:           { id: 'shipping_set',           label: 'Configure delivery' },

  // Vinted-specific listing fields
  brand_fill:             { id: 'brand_fill',             label: 'Set brand' },
  condition_set:          { id: 'condition_set',          label: 'Set condition' },
  size_set:               { id: 'size_set',               label: 'Set size' },

  // Publish
  publish:                { id: 'publish',                label: 'Publish listing' },
  publish_verify:         { id: 'publish_verify',         label: 'Verify listing' },
} as const satisfies Record<string, { id: string; label: string }>;

export type StepId = keyof typeof STEP_REGISTRY;

export type BrowserExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped';

export type BrowserExecutionStep = {
  id: string;
  label: string;
  status: BrowserExecutionStepStatus;
  message?: string | null;
};
