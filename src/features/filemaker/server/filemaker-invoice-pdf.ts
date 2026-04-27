import 'server-only';

/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/naming-convention */

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

export type FilemakerInvoicePdfExportInput = {
  invoiceId: string;
  language?: FilemakerInvoicePdfLanguage | null;
};

export type FilemakerInvoicePdfExportResult = {
  filename: string;
  pdfBuffer: Buffer;
};

type InvoiceParty = {
  address: string;
  name: string;
  taxId: string;
};

type InvoicePdfServiceLine = {
  amount: string;
  brutto: string;
  currency: string;
  name: string;
  netto: string;
  tax: string;
};

type InvoicePdfTotals = {
  bruttoTotal: string;
  leftForPayment: string;
  nettoTotal: string;
  paidAmount: string;
};

const EMPTY_PARTY: InvoiceParty = {
  address: '',
  name: '',
  taxId: '',
};

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const html = (value: string | null | undefined): string => escapeHtml(normalizeText(value));

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
  const name = normalizeText(organization?.name) || normalizeText(fallbackName);
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
  normalizeText(invoice.invoiceNo) || normalizeText(invoice.signature) || invoice.id;

const composeInvoiceFilename = (
  invoice: MongoFilemakerInvoice,
  language: FilemakerInvoicePdfLanguage
): string => `invoice-${formatInvoiceNo(invoice)}-${language}.pdf`;

const resolvePaymentDue = (invoice: MongoFilemakerInvoice): string =>
  normalizeText(invoice.cPaymentDue) ||
  normalizeText(invoice.dayForPayment) ||
  normalizeText(invoice.eventDate);

const createFallbackServiceLine = (invoice: MongoFilemakerInvoice): InvoicePdfServiceLine => {
  const serviceName =
    normalizeText(invoice.servicesServiceType) ||
    normalizeText(invoice.filesPathListName) ||
    normalizeText(invoice.filesPathListComment) ||
    '-';
  const serviceSum = normalizeText(invoice.servicesSum);

  return {
    amount: normalizeText(invoice.servicesAmount),
    brutto: serviceSum,
    currency: normalizeText(invoice.servicesCurrency),
    name: serviceName,
    netto: serviceSum,
    tax: normalizeText(invoice.servicesTaxComment || invoice.servicesVatUuid),
  };
};

const toInvoicePdfServiceLine = (
  service: MongoFilemakerInvoiceService,
  invoice: MongoFilemakerInvoice
): InvoicePdfServiceLine => {
  const name =
    normalizeText(service.serviceName) ||
    normalizeText(service.serviceNameRaw) ||
    normalizeText(service.serviceNameUuid) ||
    normalizeText(service.serviceType) ||
    normalizeText(invoice.filesPathListName) ||
    '-';
  const netto = normalizeText(service.sum) || normalizeText(service.price);
  const brutto = normalizeText(service.brutto) || netto;

  return {
    amount: normalizeText(service.amount),
    brutto,
    currency:
      normalizeText(service.currency) ||
      normalizeText(service.currencyUuid) ||
      normalizeText(invoice.servicesCurrency),
    name,
    netto,
    tax:
      normalizeText(service.vatNumber) ||
      normalizeText(service.taxComment) ||
      normalizeText(service.vatUuid),
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

const renderServiceRows = (serviceLines: InvoicePdfServiceLine[]): string =>
  serviceLines
    .map(
      (line: InvoicePdfServiceLine): string => `
        <tr>
          <td>${html(line.name)}</td>
          <td class="number">${html(line.amount)}</td>
          <td>${html('')}</td>
          <td class="number">${html(line.netto)} ${html(line.currency)}</td>
          <td class="number">${html(line.tax)}</td>
          <td class="number">${html(line.brutto)} ${html(line.currency)}</td>
        </tr>`
    )
    .join('');

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
  const currency =
    normalizeText(serviceLines.find((line: InvoicePdfServiceLine): boolean => line.currency.length > 0)?.currency) ||
    normalizeText(invoice.servicesCurrency);
  const totals = resolveInvoiceTotals({ invoice, language, serviceLines });

  return {
    filename: composeInvoiceFilename(invoice, language),
    html: `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 20mm; }
      body { color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 0; }
      .header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; justify-content: space-between; padding-bottom: 18px; }
      .title { font-size: 28px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
      .meta { color: #374151; line-height: 1.7; text-align: right; }
      .grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; margin-top: 22px; }
      .box { border: 1px solid #d1d5db; padding: 12px; }
      .box-title { color: #111827; font-size: 11px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
      .party-name { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
      .muted { color: #6b7280; }
      table { border-collapse: collapse; margin-top: 22px; width: 100%; }
      th { background: #f3f4f6; border: 1px solid #d1d5db; font-size: 10px; padding: 8px; text-align: left; text-transform: uppercase; }
      td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
      .number { text-align: right; white-space: nowrap; }
      .totals { margin-left: auto; margin-top: 18px; width: 280px; }
      .total-row { align-items: center; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; padding: 8px 0; }
      .total-row.strong { border-bottom: 2px solid #111827; font-size: 14px; font-weight: 700; }
      .signatures { display: grid; gap: 28px; grid-template-columns: 1fr 1fr; margin-top: 58px; }
      .signature { border-top: 1px solid #9ca3af; color: #6b7280; font-size: 10px; padding-top: 8px; text-align: center; }
    </style>
  </head>
  <body>
    <section class="header">
      <div>
        <div class="title">${html(label('Lg_Title'))}</div>
        <div class="muted">${html(label('Lg_Original'))}</div>
      </div>
      <div class="meta">
        <div><strong>${html(label('Lg_Number'))}</strong> ${html(formatInvoiceNo(invoice))}</div>
        <div><strong>${html(label('Lg_IssueDate'))}</strong> ${html(invoice.issueDate)}</div>
        <div><strong>${html(label('Lg_SaleDate'))}</strong> ${html(invoice.eventDate)}</div>
        <div><strong>${html(label('Lg_PaymentDue'))}</strong> ${html(resolvePaymentDue(invoice))}</div>
        <div><strong>${html(label('Lg_PaymentType'))}</strong> ${html(invoice.paymentType)}</div>
      </div>
    </section>

    <section class="grid">
      <div class="box">
        <div class="box-title">${html(label('Lg_Seller'))}</div>
        <div class="party-name">${html(seller.name)}</div>
        <div>${html(seller.address)}</div>
        <div class="muted">NIP: ${html(seller.taxId)}</div>
      </div>
      <div class="box">
        <div class="box-title">${html(label('Lg_Buyer'))}</div>
        <div class="party-name">${html(buyer.name)}</div>
        <div>${html(buyer.address)}</div>
        <div class="muted">NIP: ${html(buyer.taxId)}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>${html(label('Lg_ServiceName'))}</th>
          <th>${html(label('Lg_Amount'))}</th>
          <th>${html(label('Lg_JM'))}</th>
          <th>${html(label('Lg_NettoSum'))}</th>
          <th>${html(label('Lg_VatAmount'))}</th>
          <th>${html(label('Lg_BruttoAmount'))}</th>
        </tr>
      </thead>
      <tbody>
        ${renderServiceRows(serviceLines)}
      </tbody>
    </table>

    <section class="totals">
      <div class="total-row"><span>${html(label('Lg_NettoSum'))}</span><strong>${html(totals.nettoTotal)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_BruttoAmount'))}</span><strong>${html(totals.bruttoTotal)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_PaidAmount'))}</span><strong>${html(totals.paidAmount)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_LeftForPayment'))}</span><strong>${html(totals.leftForPayment)} ${html(currency)}</strong></div>
      <div class="total-row strong"><span>${html(label('Lg_TobePaid'))}</span><span>${html(totals.leftForPayment)} ${html(currency)}</span></div>
    </section>

    <section class="box" style="margin-top: 22px;">
      <div class="box-title">${html(label('Lg_BankDetails'))}</div>
      <div>${html(label('Lg_AccountNo'))}: ${html(seller.name)}</div>
      <div>${html(label('Lg_Swift'))}</div>
    </section>

    <section class="signatures">
      <div class="signature">${html(label('Lg_SellerSig'))}</div>
      <div class="signature">${html(label('Lg_BuyerSig'))}</div>
    </section>
  </body>
</html>`,
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

export const __testOnly = {
  buildInvoiceHtml,
  composeInvoiceFilename,
  resolvePaymentDue,
};
