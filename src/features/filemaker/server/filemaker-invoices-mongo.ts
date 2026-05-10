/**
 * Filemaker Invoices MongoDB Repository
 * 
 * MongoDB repository for managing Filemaker invoice data and organization links.
 * Provides:
 * - Invoice document storage and retrieval
 * - Organization-invoice relationship management
 * - Legacy UUID mapping and migration support
 * - Invoice collection operations
 * - Complex invoice data normalization
 */

import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const FILEMAKER_INVOICES_COLLECTION = 'filemaker_invoices';
export const FILEMAKER_INVOICE_ORGANIZATION_LINKS_COLLECTION =
  'filemaker_organization_invoice_links';

export type MongoFilemakerInvoiceOrganizationLink = {
  id: string;
  legacyOrganizationUuid?: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerInvoice = {
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  filesPathListComment?: string;
  filesPathListDateEntered?: string;
  filesPathListName?: string;
  filesPathListUuid?: string;
  hidePersonBuyer?: string;
  id: string;
  invoiceNo?: string;
  issueDate?: string;
  isPaid?: string;
  linkedOrganizations: MongoFilemakerInvoiceOrganizationLink[];
  organizationBName?: string;
  organizationBUuid?: string;
  organizationLinkCount: number;
  organizationSName?: string;
  organizationSUuid?: string;
  orgFilter?: string;
  paidSoFar?: string;
  paymentType?: string;
  servicesAmount?: string;
  servicesCurrency?: string;
  servicesServiceNameUuid?: string;
  servicesServiceType?: string;
  servicesSum?: string;
  servicesTaxComment?: string;
  servicesVatUuid?: string;
  signature?: string;
  stationaryUuid?: string;
  unresolvedOrganizationLinkCount: number;
};

export type FilemakerInvoiceMongoDocument = Document & {
  _id: string;
  cIssueYear?: string;
  cPaymentDue?: string;
  dayForPayment?: string;
  eventDate?: string;
  filesPathListComment?: string;
  filesPathListDateEntered?: string;
  filesPathListName?: string;
  filesPathListUuid?: string;
  hidePersonBuyer?: string;
  id: string;
  invoiceNo?: string;
  issueDate?: string;
  isPaid?: string;
  legacyIdentityKey?: string;
  organizationBName?: string;
  organizationBUuid?: string;
  organizationSName?: string;
  organizationSUuid?: string;
  orgFilter?: string;
  paidSoFar?: string;
  paymentType?: string;
  servicesAmount?: string;
  servicesCurrency?: string;
  servicesServiceNameUuid?: string;
  servicesServiceType?: string;
  servicesSum?: string;
  servicesTaxComment?: string;
  servicesVatUuid?: string;
  signature?: string;
  stationaryUuid?: string;
};

export type FilemakerInvoiceOrganizationLinkMongoDocument = Document & {
  _id: string;
  id: string;
  invoiceId?: string;
  legacyOrganizationUuid?: string;
  organizationId?: string;
  organizationName?: string;
};

type InvoiceWithLinksDocument = FilemakerInvoiceMongoDocument & {
  organizationLinks?: FilemakerInvoiceOrganizationLinkMongoDocument[];
};

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const optionalStringMetadata = (
  key: string,
  value: string | undefined
): Record<string, string> => {
  const normalized = optionalMetadataString(value);
  return normalized === undefined ? {} : { [key]: normalized };
};

export const getFilemakerInvoicesCollection = async (): Promise<
  Collection<FilemakerInvoiceMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerInvoiceMongoDocument>(FILEMAKER_INVOICES_COLLECTION);
};

const toOrganizationLink = (
  link: FilemakerInvoiceOrganizationLinkMongoDocument
): MongoFilemakerInvoiceOrganizationLink => ({
  id: link.id,
  ...optionalStringMetadata('legacyOrganizationUuid', link.legacyOrganizationUuid),
  ...optionalStringMetadata('organizationId', link.organizationId),
  ...optionalStringMetadata('organizationName', link.organizationName),
});

const countUnresolvedOrganizationLinks = (
  organizationLinks: FilemakerInvoiceOrganizationLinkMongoDocument[]
): number =>
  organizationLinks.filter(
    (link: FilemakerInvoiceOrganizationLinkMongoDocument): boolean =>
      optionalMetadataString(link.organizationId) === undefined
  ).length;

export function toMongoFilemakerInvoice(
  document: InvoiceWithLinksDocument
): MongoFilemakerInvoice {
  const organizationLinks = document.organizationLinks ?? [];
  return {
    ...optionalStringMetadata('cIssueYear', document.cIssueYear),
    ...optionalStringMetadata('cPaymentDue', document.cPaymentDue),
    ...optionalStringMetadata('dayForPayment', document.dayForPayment),
    ...optionalStringMetadata('eventDate', document.eventDate),
    ...optionalStringMetadata('filesPathListComment', document.filesPathListComment),
    ...optionalStringMetadata('filesPathListDateEntered', document.filesPathListDateEntered),
    ...optionalStringMetadata('filesPathListName', document.filesPathListName),
    ...optionalStringMetadata('filesPathListUuid', document.filesPathListUuid),
    ...optionalStringMetadata('hidePersonBuyer', document.hidePersonBuyer),
    id: document.id,
    ...optionalStringMetadata('invoiceNo', document.invoiceNo),
    ...optionalStringMetadata('issueDate', document.issueDate),
    ...optionalStringMetadata('isPaid', document.isPaid),
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    ...optionalStringMetadata('organizationBName', document.organizationBName),
    ...optionalStringMetadata('organizationBUuid', document.organizationBUuid),
    organizationLinkCount: organizationLinks.length,
    ...optionalStringMetadata('organizationSName', document.organizationSName),
    ...optionalStringMetadata('organizationSUuid', document.organizationSUuid),
    ...optionalStringMetadata('orgFilter', document.orgFilter),
    ...optionalStringMetadata('paidSoFar', document.paidSoFar),
    ...optionalStringMetadata('paymentType', document.paymentType),
    ...optionalStringMetadata('servicesAmount', document.servicesAmount),
    ...optionalStringMetadata('servicesCurrency', document.servicesCurrency),
    ...optionalStringMetadata('servicesServiceNameUuid', document.servicesServiceNameUuid),
    ...optionalStringMetadata('servicesServiceType', document.servicesServiceType),
    ...optionalStringMetadata('servicesSum', document.servicesSum),
    ...optionalStringMetadata('servicesTaxComment', document.servicesTaxComment),
    ...optionalStringMetadata('servicesVatUuid', document.servicesVatUuid),
    ...optionalStringMetadata('signature', document.signature),
    ...optionalStringMetadata('stationaryUuid', document.stationaryUuid),
    unresolvedOrganizationLinkCount: countUnresolvedOrganizationLinks(organizationLinks),
  };
}
