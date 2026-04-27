import 'server-only';

/* eslint-disable complexity, max-lines-per-function */

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
  ...(optionalMetadataString(link.legacyOrganizationUuid) !== undefined
    ? { legacyOrganizationUuid: optionalMetadataString(link.legacyOrganizationUuid) }
    : {}),
  ...(optionalMetadataString(link.organizationId) !== undefined
    ? { organizationId: optionalMetadataString(link.organizationId) }
    : {}),
  ...(optionalMetadataString(link.organizationName) !== undefined
    ? { organizationName: optionalMetadataString(link.organizationName) }
    : {}),
});

export function toMongoFilemakerInvoice(
  document: InvoiceWithLinksDocument
): MongoFilemakerInvoice {
  const organizationLinks = document.organizationLinks ?? [];
  return {
    ...(optionalMetadataString(document.cIssueYear) !== undefined
      ? { cIssueYear: optionalMetadataString(document.cIssueYear) }
      : {}),
    ...(optionalMetadataString(document.cPaymentDue) !== undefined
      ? { cPaymentDue: optionalMetadataString(document.cPaymentDue) }
      : {}),
    ...(optionalMetadataString(document.dayForPayment) !== undefined
      ? { dayForPayment: optionalMetadataString(document.dayForPayment) }
      : {}),
    ...(optionalMetadataString(document.eventDate) !== undefined
      ? { eventDate: optionalMetadataString(document.eventDate) }
      : {}),
    ...(optionalMetadataString(document.filesPathListComment) !== undefined
      ? { filesPathListComment: optionalMetadataString(document.filesPathListComment) }
      : {}),
    ...(optionalMetadataString(document.filesPathListDateEntered) !== undefined
      ? { filesPathListDateEntered: optionalMetadataString(document.filesPathListDateEntered) }
      : {}),
    ...(optionalMetadataString(document.filesPathListName) !== undefined
      ? { filesPathListName: optionalMetadataString(document.filesPathListName) }
      : {}),
    ...(optionalMetadataString(document.filesPathListUuid) !== undefined
      ? { filesPathListUuid: optionalMetadataString(document.filesPathListUuid) }
      : {}),
    ...(optionalMetadataString(document.hidePersonBuyer) !== undefined
      ? { hidePersonBuyer: optionalMetadataString(document.hidePersonBuyer) }
      : {}),
    id: document.id,
    ...(optionalMetadataString(document.invoiceNo) !== undefined
      ? { invoiceNo: optionalMetadataString(document.invoiceNo) }
      : {}),
    ...(optionalMetadataString(document.issueDate) !== undefined
      ? { issueDate: optionalMetadataString(document.issueDate) }
      : {}),
    ...(optionalMetadataString(document.isPaid) !== undefined
      ? { isPaid: optionalMetadataString(document.isPaid) }
      : {}),
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    ...(optionalMetadataString(document.organizationBName) !== undefined
      ? { organizationBName: optionalMetadataString(document.organizationBName) }
      : {}),
    ...(optionalMetadataString(document.organizationBUuid) !== undefined
      ? { organizationBUuid: optionalMetadataString(document.organizationBUuid) }
      : {}),
    organizationLinkCount: organizationLinks.length,
    ...(optionalMetadataString(document.organizationSName) !== undefined
      ? { organizationSName: optionalMetadataString(document.organizationSName) }
      : {}),
    ...(optionalMetadataString(document.organizationSUuid) !== undefined
      ? { organizationSUuid: optionalMetadataString(document.organizationSUuid) }
      : {}),
    ...(optionalMetadataString(document.orgFilter) !== undefined
      ? { orgFilter: optionalMetadataString(document.orgFilter) }
      : {}),
    ...(optionalMetadataString(document.paidSoFar) !== undefined
      ? { paidSoFar: optionalMetadataString(document.paidSoFar) }
      : {}),
    ...(optionalMetadataString(document.paymentType) !== undefined
      ? { paymentType: optionalMetadataString(document.paymentType) }
      : {}),
    ...(optionalMetadataString(document.servicesAmount) !== undefined
      ? { servicesAmount: optionalMetadataString(document.servicesAmount) }
      : {}),
    ...(optionalMetadataString(document.servicesCurrency) !== undefined
      ? { servicesCurrency: optionalMetadataString(document.servicesCurrency) }
      : {}),
    ...(optionalMetadataString(document.servicesServiceNameUuid) !== undefined
      ? { servicesServiceNameUuid: optionalMetadataString(document.servicesServiceNameUuid) }
      : {}),
    ...(optionalMetadataString(document.servicesServiceType) !== undefined
      ? { servicesServiceType: optionalMetadataString(document.servicesServiceType) }
      : {}),
    ...(optionalMetadataString(document.servicesSum) !== undefined
      ? { servicesSum: optionalMetadataString(document.servicesSum) }
      : {}),
    ...(optionalMetadataString(document.servicesTaxComment) !== undefined
      ? { servicesTaxComment: optionalMetadataString(document.servicesTaxComment) }
      : {}),
    ...(optionalMetadataString(document.servicesVatUuid) !== undefined
      ? { servicesVatUuid: optionalMetadataString(document.servicesVatUuid) }
      : {}),
    ...(optionalMetadataString(document.signature) !== undefined
      ? { signature: optionalMetadataString(document.signature) }
      : {}),
    ...(optionalMetadataString(document.stationaryUuid) !== undefined
      ? { stationaryUuid: optionalMetadataString(document.stationaryUuid) }
      : {}),
    unresolvedOrganizationLinkCount: organizationLinks.filter(
      (link: FilemakerInvoiceOrganizationLinkMongoDocument): boolean =>
        optionalMetadataString(link.organizationId) === undefined
    ).length,
  };
}
