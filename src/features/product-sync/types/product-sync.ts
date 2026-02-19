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

export {
  PRODUCT_SYNC_APP_FIELDS,
  DEFAULT_PRODUCT_SYNC_FIELD_RULES,
  PRODUCT_SYNC_DIRECTION_OPTIONS,
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
