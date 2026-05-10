import 'server-only';

import { createPdfDownloadResponse, renderHtmlToPdfBuffer } from '@/features/pdf-export/server';
import type { FilemakerOrganization } from '@/features/filemaker/types';
import { readFilemakerCampaignSettingValue } from '@/features/filemaker/server/campaign-settings-store';

import {
  FILEMAKER_INVOICE_PDF_SETTINGS_KEY,
  getFilemakerInvoicePdfLabel,
  parseFilemakerInvoicePdfSettings,
  type FilemakerInvoicePdfLabelKey,
  type FilemakerInvoicePdfLanguage,
} from '../filemaker-invoice-pdf-settings';
import {
  listMongoFilemakerInvoiceServicesByInvoiceId,
  type MongoFilemakerInvoiceService,
} from './filemaker-invoice-services-mongo';
import { type MongoFilemakerInvoice } from './filemaker-invoices-mongo';
import { requireMongoFilemakerInvoiceById } from './filemaker-invoices-repository';
import {
  getFilemakerOrganizationsCollection,
  toFilemakerOrganization,
  type FilemakerOrganizationMongoDocument,
} from './filemaker-organizations-mongo';
import {
  renderInvoiceHtmlDocument,
  type InvoiceParty,
  type InvoicePdfServiceLine,
  type InvoicePdfTotals,
} from './filemaker-invoice-pdf-html';

export type FilemakerInvoicePdfExportInput = {
  invoiceId: string;
  language?: FilemakerInvoicePdfLanguage | null;
};

export type FilemakerInvoicePdfExportResult = {
  filename: string;
  pdfBuffer: Buffer;
};

const EMPTY_PARTY: InvoiceParty = {
  address: '',
  name: '',
  taxId: '',
};

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const firstNonEmptyText = (
  values: Array<string | null | undefined>,
  fallback = ''
): string =>
  values.map(normalizeText).find((value: string): boolean => value.length > 0) ?? fallback;

const parseMoney = (value: string | null | undefined): number | null => {
  const normalized = normalizeText(value)
    .replace(/\s/g, '')
    .replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (
  value: number,
  language: FilemakerInvoicePdfLanguage
): string =>
  new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

const sumMoneyValues = (values: string[]): number | null => {
  const parsedValues = values
    .map((value: string): number | null => parseMoney(value))
    .filter((value): value is number => value !== null);
  if (parsedValues.length === 0) return null;
  return parsedValues.reduce((sum: number, value: number): number => sum + value, 0);
};

const formatAddress = (organization: FilemakerOrganization | null): string => {
  if (organization === null) return '';
  return [
    [organization.street, organization.streetNumber].map(normalizeText).filter(Boolean).join(' '),
    [organization.postalCode, organization.city].map(normalizeText).filter(Boolean).join(' '),
    organization.country,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(', ');
};

const resolveParty = (
  organization: FilemakerOrganization | null,
  fallbackName: string | undefined
): InvoiceParty => {
  const name = firstNonEmptyText([organization?.name, fallbackName]);
  if (name.length === 0) return EMPTY_PARTY;
  return {
    address: formatAddress(organization),
    name,
    taxId: normalizeText(organization?.taxId),
  };
};

const findInvoiceOrganizationDocuments = async (
  invoice: MongoFilemakerInvoice
): Promise<Map<string, FilemakerOrganization>> => {
  const legacyUuids = [invoice.organizationBUuid, invoice.organizationSUuid]
    .map(normalizeText)
    .filter(Boolean);
  if (legacyUuids.length === 0) return new Map();

  const collection = await getFilemakerOrganizationsCollection();
  const documents = await collection
    .find({ legacyUuid: { $in: legacyUuids } })
    .toArray();

  return new Map(
    documents
      .map((document: FilemakerOrganizationMongoDocument): [string, FilemakerOrganization] | null => {
        const legacyUuid = normalizeText(document.legacyUuid);
        if (legacyUuid.length === 0) return null;
        return [legacyUuid, toFilemakerOrganization(document)];
      })
      .filter((entry): entry is [string, FilemakerOrganization] => entry !== null)
  );
};

const resolveInvoiceLanguage = async (
  language: FilemakerInvoicePdfLanguage | null | undefined
): Promise<{
  language: FilemakerInvoicePdfLanguage;
  label: (key: FilemakerInvoicePdfLabelKey) => string;
}> => {
  const rawSettings = await readFilemakerCampaignSettingValue(FILEMAKER_INVOICE_PDF_SETTINGS_KEY);
  const settings = parseFilemakerInvoicePdfSettings(rawSettings);
  const resolvedLanguage = language === 'en' || language === 'pl' ? language : settings.defaultLanguage;
  return {
    language: resolvedLanguage,
    label: (key) => getFilemakerInvoicePdfLabel(settings, key, resolvedLanguage),
  };
};

const formatInvoiceNo = (invoice: MongoFilemakerInvoice): string =>
  firstNonEmptyText([invoice.invoiceNo, invoice.signature], invoice.id);

const composeInvoiceFilename = (
  invoice: MongoFilemakerInvoice,
  language: FilemakerInvoicePdfLanguage
): string => `invoice-${formatInvoiceNo(invoice)}-${language}.pdf`;

const resolvePaymentDue = (invoice: MongoFilemakerInvoice): string =>
  firstNonEmptyText([invoice.cPaymentDue, invoice.dayForPayment, invoice.eventDate]);

const createFallbackServiceLine = (invoice: MongoFilemakerInvoice): InvoicePdfServiceLine => {
  const serviceName = firstNonEmptyText(
    [invoice.servicesServiceType, invoice.filesPathListName, invoice.filesPathListComment],
    '-'
  );
  const serviceSum = normalizeText(invoice.servicesSum);

  return {
    amount: normalizeText(invoice.servicesAmount),
    brutto: serviceSum,
    currency: normalizeText(invoice.servicesCurrency),
    name: serviceName,
    netto: serviceSum,
    tax: firstNonEmptyText([invoice.servicesTaxComment, invoice.servicesVatUuid]),
  };
};

const toInvoicePdfServiceLine = (
  service: MongoFilemakerInvoiceService,
  invoice: MongoFilemakerInvoice
): InvoicePdfServiceLine => {
  const name = firstNonEmptyText(
    [
      service.serviceName,
      service.serviceNameRaw,
      service.serviceNameUuid,
      service.serviceType,
      invoice.filesPathListName,
    ],
    '-'
  );
  const netto = firstNonEmptyText([service.sum, service.price]);
  const brutto = firstNonEmptyText([service.brutto], netto);

  return {
    amount: normalizeText(service.amount),
    brutto,
    currency: firstNonEmptyText([service.currency, service.currencyUuid, invoice.servicesCurrency]),
    name,
    netto,
    tax: firstNonEmptyText([service.vatNumber, service.taxComment, service.vatUuid]),
  };
};

const resolveInvoiceServiceLines = async (
  invoice: MongoFilemakerInvoice
): Promise<InvoicePdfServiceLine[]> => {
  const importedServices = await listMongoFilemakerInvoiceServicesByInvoiceId(invoice.id);
  if (importedServices.length === 0) return [createFallbackServiceLine(invoice)];
  return importedServices.map((service: MongoFilemakerInvoiceService): InvoicePdfServiceLine =>
    toInvoicePdfServiceLine(service, invoice)
  );
};

const resolveInvoiceTotals = (
  input: {
    invoice: MongoFilemakerInvoice;
    language: FilemakerInvoicePdfLanguage;
    serviceLines: InvoicePdfServiceLine[];
  }
): InvoicePdfTotals => {
  const nettoTotalValue = sumMoneyValues(
    input.serviceLines.map((line: InvoicePdfServiceLine): string => line.netto)
  );
  const bruttoTotalValue = sumMoneyValues(
    input.serviceLines.map((line: InvoicePdfServiceLine): string => line.brutto)
  );
  const paidAmountValue = parseMoney(input.invoice.paidSoFar) ?? 0;
  const payableValue = bruttoTotalValue ?? nettoTotalValue;

  return {
    bruttoTotal:
      bruttoTotalValue !== null
        ? formatMoney(bruttoTotalValue, input.language)
        : normalizeText(input.invoice.servicesSum),
    leftForPayment:
      payableValue !== null
        ? formatMoney(Math.max(payableValue - paidAmountValue, 0), input.language)
        : normalizeText(input.invoice.servicesSum),
    nettoTotal:
      nettoTotalValue !== null
        ? formatMoney(nettoTotalValue, input.language)
        : normalizeText(input.invoice.servicesSum),
    paidAmount: formatMoney(paidAmountValue, input.language),
  };
};

const buildInvoiceHtml = async (
  invoice: MongoFilemakerInvoice,
  requestedLanguage: FilemakerInvoicePdfLanguage | null | undefined
): Promise<{ filename: string; html: string }> => {
  const { language, label } = await resolveInvoiceLanguage(requestedLanguage);
  const organizationByLegacyUuid = await findInvoiceOrganizationDocuments(invoice);
  const buyer = resolveParty(
    organizationByLegacyUuid.get(normalizeText(invoice.organizationBUuid)) ?? null,
    invoice.organizationBName
  );
  const seller = resolveParty(
    organizationByLegacyUuid.get(normalizeText(invoice.organizationSUuid)) ?? null,
    invoice.organizationSName
  );
  const serviceLines = await resolveInvoiceServiceLines(invoice);
  const currency = firstNonEmptyText([
    serviceLines.find((line: InvoicePdfServiceLine): boolean => line.currency.length > 0)?.currency,
    invoice.servicesCurrency,
  ]);
  const totals = resolveInvoiceTotals({ invoice, language, serviceLines });

  return {
    filename: composeInvoiceFilename(invoice, language),
    html: renderInvoiceHtmlDocument({
      buyer,
      currency,
      invoice: {
        eventDate: invoice.eventDate,
        issueDate: invoice.issueDate,
        number: formatInvoiceNo(invoice),
        paymentDue: resolvePaymentDue(invoice),
        paymentType: invoice.paymentType,
      },
      label,
      language,
      seller,
      serviceLines,
      totals,
    }),
  };
};

export async function createFilemakerInvoicePdfExport(
  input: FilemakerInvoicePdfExportInput
): Promise<FilemakerInvoicePdfExportResult> {
  const invoice = await requireMongoFilemakerInvoiceById(input.invoiceId);
  const result = await buildInvoiceHtml(invoice, input.language);
  return {
    filename: result.filename,
    pdfBuffer: await renderHtmlToPdfBuffer({ html: result.html }),
  };
}

export async function createFilemakerInvoicePdfResponse(
  input: FilemakerInvoicePdfExportInput
): Promise<Response> {
  const result = await createFilemakerInvoicePdfExport(input);
  return createPdfDownloadResponse(result);
}

const testOnly = {
  buildInvoiceHtml,
  composeInvoiceFilename,
  resolvePaymentDue,
};

export { testOnly as __testOnly };
