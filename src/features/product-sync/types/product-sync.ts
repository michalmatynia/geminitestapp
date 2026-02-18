import type {
  ProductSyncAppFieldDto,
  ProductSyncDirectionDto,
  ProductSyncConflictPolicyDto,
  ProductSyncFieldRuleDto,
  ProductSyncProfileDto,
  ProductSyncRunStatusDto,
  ProductSyncRunTriggerDto,
  ProductSyncRunStatsDto,
  ProductSyncRunRecordDto,
  ProductSyncRunItemStatusDto,
  ProductSyncRunItemRecordDto,
  ProductSyncRunDetailDto,
} from '@/shared/contracts/product-sync';

export type ProductSyncAppField = ProductSyncAppFieldDto;

export type ProductSyncDirection = ProductSyncDirectionDto;

export type ProductSyncConflictPolicy = ProductSyncConflictPolicyDto;

export type ProductSyncFieldRule = ProductSyncFieldRuleDto;

export type ProductSyncProfile = ProductSyncProfileDto;

export type ProductSyncRunStatus = ProductSyncRunStatusDto;

export type ProductSyncRunTrigger = ProductSyncRunTriggerDto;

export type ProductSyncRunStats = ProductSyncRunStatsDto;

export type ProductSyncRunRecord = ProductSyncRunRecordDto;

export type ProductSyncRunItemStatus = ProductSyncRunItemStatusDto;

export type ProductSyncRunItemRecord = ProductSyncRunItemRecordDto;

export type ProductSyncRunDetail = ProductSyncRunDetailDto;

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
