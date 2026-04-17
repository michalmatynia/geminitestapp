import 'server-only';

import type {
  CreateProductListingInput,
  ProductListingExportEventRecord,
} from '@/shared/contracts/integration-listing-storage';

export const buildPlaywrightListingExportHistoryRecord = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  exportedAt,
  status,
  relist,
  requestId,
  fields,
  externalListingId,
  expiresAt,
  failureReason,
  extra,
}: {
  exportedAt: Date;
  status: string;
  relist: boolean;
  requestId?: string | null;
  fields?: string[] | null;
  externalListingId?: string | null;
  expiresAt?: Date | string | null;
  failureReason?: string | null;
  extra?: TExtra;
}): ProductListingExportEventRecord & TExtra => ({
  exportedAt,
  status,
  ...(externalListingId !== undefined ? { externalListingId } : {}),
  ...(expiresAt !== undefined ? { expiresAt } : {}),
  ...(failureReason !== undefined ? { failureReason } : {}),
  relist,
  requestId: requestId ?? null,
  fields: fields ?? null,
  ...(extra ?? ({} as TExtra)),
});

export const buildPlaywrightListingSuccessUpdateFields = <
  TExtra extends Partial<CreateProductListingInput> = Partial<CreateProductListingInput>,
>({
  at,
  marketplaceData,
  externalListingId,
  extra,
}: {
  at: Date;
  marketplaceData: Record<string, unknown>;
  externalListingId?: string | null;
  extra?: TExtra;
}): Partial<CreateProductListingInput> & TExtra => ({
  ...(externalListingId !== undefined ? { externalListingId } : {}),
  lastStatusCheckAt: at,
  failureReason: null,
  marketplaceData,
  ...(extra ?? ({} as TExtra)),
});

export const buildPlaywrightListingFailureUpdateFields = <
  TExtra extends Partial<CreateProductListingInput> = Partial<CreateProductListingInput>,
>({
  at,
  marketplaceData,
  failureReason,
  extra,
}: {
  at: Date;
  marketplaceData: Record<string, unknown>;
  failureReason: string;
  extra?: TExtra;
}): Partial<CreateProductListingInput> & TExtra => ({
  lastStatusCheckAt: at,
  failureReason,
  marketplaceData,
  ...(extra ?? ({} as TExtra)),
});
