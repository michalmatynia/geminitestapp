import type {
  BaseImportErrorClass,
  BaseImportErrorCode,
  BaseImportItemAction,
  BaseImportItemStatus,
  BaseImportParameterImportSummary,
} from './base-com';
import type { Product as ProductRecord } from '../products';
import type { ProductCreateInput } from '../products/io';

export type ImportDecision =
  | { type: 'create' }
  | { type: 'update'; target: ProductRecord }
  | { type: 'skip'; code: BaseImportErrorCode; message: string }
  | { type: 'fail'; code: BaseImportErrorCode; message: string };

export type ProcessItemResult = {
  status: Exclude<BaseImportItemStatus, 'pending' | 'processing'>;
  action: BaseImportItemAction | null;
  importedProductId?: string | null;
  baseProductId?: string | null;
  sku?: string | null;
  errorCode?: BaseImportErrorCode | null;
  errorClass?: BaseImportErrorClass | null;
  errorMessage?: string | null;
  retryable?: boolean | null;
  nextRetryAt?: string | null;
  lastErrorAt?: string | null;
  metadata?: Record<string, unknown>;
  payloadSnapshot?: ProductCreateInput | null;
  parameterImportSummary?: BaseImportParameterImportSummary | null;
};

export type NormalizedMappedProduct = ProductCreateInput & {
  producerIds?: string[];
  tagIds?: string[];
};
