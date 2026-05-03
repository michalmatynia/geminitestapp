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

const OPTIONAL_SERVICE_STRING_KEYS = [
  'amount',
  'brutto',
  'currency',
  'currencyUuid',
  'invoiceId',
  'legacyParentUuid',
  'legacyUuid',
  'price',
  'serviceName',
  'serviceNameRaw',
  'serviceNameUuid',
  'serviceType',
  'sum',
  'taxComment',
  'total',
  'vatNumber',
  'vatUuid',
] as const;

const buildOptionalServiceFields = (
  document: FilemakerInvoiceServiceMongoDocument
): Partial<MongoFilemakerInvoiceService> => {
  const fields: Partial<MongoFilemakerInvoiceService> = {};
  for (const key of OPTIONAL_SERVICE_STRING_KEYS) {
    const normalized = optionalMetadataString(document[key]);
    if (normalized !== undefined) fields[key] = normalized;
  }
  return fields;
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
    ...buildOptionalServiceFields(document),
    id: document.id,
    rowIndex: typeof document.rowIndex === 'number' ? document.rowIndex : 0,
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
