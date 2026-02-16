export type ProductSyncAppField =
  | 'stock'
  | 'price'
  | 'name_en'
  | 'description_en'
  | 'sku'
  | 'ean'
  | 'weight';

export type ProductSyncDirection = 'disabled' | 'base_to_app' | 'app_to_base';

export type ProductSyncConflictPolicy = 'skip';

export type ProductSyncFieldRule = {
  id: string;
  appField: ProductSyncAppField;
  baseField: string;
  direction: ProductSyncDirection;
};

export type ProductSyncProfile = {
  id: string;
  name: string;
  enabled: boolean;
  connectionId: string;
  inventoryId: string;
  catalogId: string | null;
  scheduleIntervalMinutes: number;
  batchSize: number;
  conflictPolicy: ProductSyncConflictPolicy;
  fieldRules: ProductSyncFieldRule[];
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductSyncRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'partial_success'
  | 'failed';

export type ProductSyncRunTrigger = 'manual' | 'scheduled' | 'relink';

export type ProductSyncRunStats = {
  total: number;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  localUpdated: number;
  baseUpdated: number;
};

export type ProductSyncRunRecord = {
  id: string;
  profileId: string;
  profileName: string;
  trigger: ProductSyncRunTrigger;
  status: ProductSyncRunStatus;
  queueJobId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  summaryMessage: string | null;
  errorMessage: string | null;
  stats: ProductSyncRunStats;
  createdAt: string;
  updatedAt: string;
};

export type ProductSyncRunItemStatus = 'success' | 'skipped' | 'failed';

export type ProductSyncRunItemRecord = {
  runId: string;
  itemId: string;
  productId: string;
  baseProductId: string;
  status: ProductSyncRunItemStatus;
  localChanges: string[];
  baseChanges: string[];
  message: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductSyncRunDetail = {
  run: ProductSyncRunRecord;
  items: ProductSyncRunItemRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export const PRODUCT_SYNC_APP_FIELDS: ProductSyncAppField[] = [
  'stock',
  'price',
  'name_en',
  'description_en',
  'sku',
  'ean',
  'weight',
];

export const DEFAULT_PRODUCT_SYNC_FIELD_RULES: Array<Omit<ProductSyncFieldRule, 'id'>> = [
  {
    appField: 'stock',
    baseField: 'stock',
    direction: 'base_to_app',
  },
  {
    appField: 'name_en',
    baseField: 'text_fields.name',
    direction: 'app_to_base',
  },
  {
    appField: 'description_en',
    baseField: 'text_fields.description',
    direction: 'app_to_base',
  },
  {
    appField: 'price',
    baseField: 'prices.0',
    direction: 'disabled',
  },
  {
    appField: 'sku',
    baseField: 'sku',
    direction: 'disabled',
  },
  {
    appField: 'ean',
    baseField: 'ean',
    direction: 'disabled',
  },
  {
    appField: 'weight',
    baseField: 'weight',
    direction: 'disabled',
  },
];

export const PRODUCT_SYNC_DIRECTION_OPTIONS: ProductSyncDirection[] = [
  'disabled',
  'base_to_app',
  'app_to_base',
];
