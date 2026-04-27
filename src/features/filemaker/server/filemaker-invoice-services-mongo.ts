import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const FILEMAKER_INVOICE_SERVICES_COLLECTION = 'filemaker_invoice_services';

export type MongoFilemakerInvoiceService = {
  amount?: string;
  brutto?: string;
  currency?: string;
  currencyUuid?: string;
  id: string;
  invoiceId?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  price?: string;
  rowIndex: number;
  serviceName?: string;
  serviceNameRaw?: string;
  serviceNameUuid?: string;
  serviceType?: string;
  sum?: string;
  taxComment?: string;
  total?: string;
  vatNumber?: string;
  vatUuid?: string;
};

export type FilemakerInvoiceServiceMongoDocument = Document & {
  _id: string;
  amount?: string;
  brutto?: string;
  currency?: string;
  currencyUuid?: string;
  id: string;
  invoiceId?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  price?: string;
  rowIndex?: number;
  serviceName?: string;
  serviceNameRaw?: string;
  serviceNameUuid?: string;
  serviceType?: string;
  sum?: string;
  taxComment?: string;
  total?: string;
  vatNumber?: string;
  vatUuid?: string;
};

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

export const getFilemakerInvoiceServicesCollection = async (): Promise<
  Collection<FilemakerInvoiceServiceMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerInvoiceServiceMongoDocument>(
    FILEMAKER_INVOICE_SERVICES_COLLECTION
  );
};

export function toMongoFilemakerInvoiceService(
  document: FilemakerInvoiceServiceMongoDocument
): MongoFilemakerInvoiceService {
  return {
    ...(optionalMetadataString(document.amount) !== undefined
      ? { amount: optionalMetadataString(document.amount) }
      : {}),
    ...(optionalMetadataString(document.brutto) !== undefined
      ? { brutto: optionalMetadataString(document.brutto) }
      : {}),
    ...(optionalMetadataString(document.currency) !== undefined
      ? { currency: optionalMetadataString(document.currency) }
      : {}),
    ...(optionalMetadataString(document.currencyUuid) !== undefined
      ? { currencyUuid: optionalMetadataString(document.currencyUuid) }
      : {}),
    id: document.id,
    ...(optionalMetadataString(document.invoiceId) !== undefined
      ? { invoiceId: optionalMetadataString(document.invoiceId) }
      : {}),
    ...(optionalMetadataString(document.legacyParentUuid) !== undefined
      ? { legacyParentUuid: optionalMetadataString(document.legacyParentUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyUuid) !== undefined
      ? { legacyUuid: optionalMetadataString(document.legacyUuid) }
      : {}),
    ...(optionalMetadataString(document.price) !== undefined
      ? { price: optionalMetadataString(document.price) }
      : {}),
    rowIndex: typeof document.rowIndex === 'number' ? document.rowIndex : 0,
    ...(optionalMetadataString(document.serviceName) !== undefined
      ? { serviceName: optionalMetadataString(document.serviceName) }
      : {}),
    ...(optionalMetadataString(document.serviceNameRaw) !== undefined
      ? { serviceNameRaw: optionalMetadataString(document.serviceNameRaw) }
      : {}),
    ...(optionalMetadataString(document.serviceNameUuid) !== undefined
      ? { serviceNameUuid: optionalMetadataString(document.serviceNameUuid) }
      : {}),
    ...(optionalMetadataString(document.serviceType) !== undefined
      ? { serviceType: optionalMetadataString(document.serviceType) }
      : {}),
    ...(optionalMetadataString(document.sum) !== undefined
      ? { sum: optionalMetadataString(document.sum) }
      : {}),
    ...(optionalMetadataString(document.taxComment) !== undefined
      ? { taxComment: optionalMetadataString(document.taxComment) }
      : {}),
    ...(optionalMetadataString(document.total) !== undefined
      ? { total: optionalMetadataString(document.total) }
      : {}),
    ...(optionalMetadataString(document.vatNumber) !== undefined
      ? { vatNumber: optionalMetadataString(document.vatNumber) }
      : {}),
    ...(optionalMetadataString(document.vatUuid) !== undefined
      ? { vatUuid: optionalMetadataString(document.vatUuid) }
      : {}),
  };
}

export async function listMongoFilemakerInvoiceServicesByInvoiceId(
  invoiceId: string
): Promise<MongoFilemakerInvoiceService[]> {
  const normalizedInvoiceId = invoiceId.trim();
  if (normalizedInvoiceId.length === 0) return [];

  const collection = await getFilemakerInvoiceServicesCollection();
  const documents = await collection
    .find({ invoiceId: normalizedInvoiceId })
    .sort({ rowIndex: 1, creationTimestamp: 1, _id: 1 })
    .toArray();

  return documents.map(toMongoFilemakerInvoiceService);
}
