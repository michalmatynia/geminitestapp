import type { ImportedBaseOrderRecord } from '@/shared/contracts/products/orders-import';
import type { ImportedBaseOrderDoc } from './types';

export const buildImportedOrderId = (connectionId: string, baseOrderId: string): string =>
  `${connectionId}:${baseOrderId}`;

export const toDomain = (doc: ImportedBaseOrderDoc): ImportedBaseOrderRecord => ({
  id: doc._id,
  connectionId: doc.connectionId,
  baseOrderId: doc.baseOrderId,
  orderNumber: doc.orderNumber ?? null,
  externalStatusId: doc.externalStatusId ?? null,
  externalStatusName: doc.externalStatusName ?? null,
  buyerName: doc.buyerName,
  buyerEmail: doc.buyerEmail ?? null,
  currency: doc.currency ?? null,
  totalGross: typeof doc.totalGross === 'number' ? doc.totalGross : null,
  deliveryMethod: doc.deliveryMethod ?? null,
  paymentMethod: doc.paymentMethod ?? null,
  source: doc.source ?? null,
  orderCreatedAt: doc.orderCreatedAt ?? null,
  orderUpdatedAt: doc.orderUpdatedAt ?? null,
  lineItems: Array.isArray(doc.lineItems) ? doc.lineItems : [],
  fingerprint: doc.fingerprint,
  raw: doc.raw ?? null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  firstImportedAt: doc.firstImportedAt.toISOString(),
  lastImportedAt: doc.lastImportedAt.toISOString(),
});
