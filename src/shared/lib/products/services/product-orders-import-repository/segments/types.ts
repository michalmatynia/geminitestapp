import type { Document } from 'mongodb';
import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';

export const COLLECTION = 'product_imported_orders';

export type ImportedBaseOrderDoc = Document & {
  _id: string;
  connectionId: string;
  baseOrderId: string;
  orderNumber: string | null;
  externalStatusId: string | null;
  externalStatusName: string | null;
  buyerName: string;
  buyerEmail: string | null;
  currency: string | null;
  totalGross: number | null;
  deliveryMethod: string | null;
  paymentMethod: string | null;
  source: string | null;
  orderCreatedAt: string | null;
  orderUpdatedAt: string | null;
  lineItems: BaseOrderImportPreviewItem['lineItems'];
  fingerprint: string;
  raw: unknown;
  createdAt: Date;
  updatedAt: Date;
  firstImportedAt: Date;
  lastImportedAt: Date;
};
