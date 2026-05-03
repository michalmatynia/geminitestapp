export const FILEMAKER_INVOICE_PDF_SETTINGS_KEY = 'filemaker_invoice_pdf_settings_v1';

export const filemakerInvoicePdfLanguageValues = ['pl', 'en'] as const;
export type FilemakerInvoicePdfLanguage = (typeof filemakerInvoicePdfLanguageValues)[number];

export const filemakerInvoicePdfLabelKeys = [
  'Lg_AccountNo',
  'Lg_Address',
  'Lg_Amount',
  'Lg_BankDetails',
  'Lg_BruttoAmount',
  'Lg_BruttoQuantity',
  'Lg_Buyer',
  'Lg_BuyerSig',
  'Lg_Including',
  'Lg_IssueDate',
  'Lg_JM',
  'Lg_LeftForPayment',
  'Lg_NettoPrice',
  'Lg_NettoSum',
  'Lg_Number',
  'Lg_Original',
  'Lg_PaidAmount',
  'Lg_PaymentDue',
  'Lg_PaymentType',
  'Lg_PhoneNo',
  'Lg_PKWiU',
  'Lg_SaleDate',
  'Lg_Seller',
  'Lg_SellerSig',
  'Lg_ServiceName',
  'Lg_Sum',
  'Lg_Swift',
  'Lg_Title',
  'Lg_TobePaid',
  'Lg_VatAmount',
] as const;

export type FilemakerInvoicePdfLabelKey = (typeof filemakerInvoicePdfLabelKeys)[number];
export type FilemakerInvoicePdfLabelTranslations = Record<FilemakerInvoicePdfLanguage, string>;

export type FilemakerInvoicePdfSettings = {
  defaultLanguage: FilemakerInvoicePdfLanguage;
  labels: Record<FilemakerInvoicePdfLabelKey, FilemakerInvoicePdfLabelTranslations>;
};

export const defaultFilemakerInvoicePdfLabels: Record<
  FilemakerInvoicePdfLabelKey,
  FilemakerInvoicePdfLabelTranslations
> = {
  Lg_AccountNo: { pl: 'Numer Konta', en: 'Account No.' },
  Lg_Address: { pl: 'Adres', en: 'Address' },
  Lg_Amount: { pl: 'Ilość', en: 'Amount' },
  Lg_BankDetails: { pl: 'Dane do przelewu:', en: 'Bank Details' },
  Lg_BruttoAmount: { pl: 'Suma Brutto', en: 'Brutto Sum' },
  Lg_BruttoQuantity: { pl: 'Wartość Brutto', en: 'Brutto Quantity' },
  Lg_Buyer: { pl: 'Kupujący', en: 'Buyer' },
  Lg_BuyerSig: {
    pl: 'imię, nazwisko i podpis osoby upoważnionej do odbioru dokumentu',
    en: 'name, surname and signature of the recipient',
  },
  Lg_Including: { pl: 'W tym', en: 'Including' },
  Lg_IssueDate: { pl: 'Data wystawienia', en: 'Issue Date' },
  Lg_JM: { pl: 'JM', en: 'JM' },
  Lg_LeftForPayment: { pl: 'Pozostało do zapłaty', en: 'Left for Payment' },
  Lg_NettoPrice: { pl: 'Cena jednostkowa netto', en: 'Netto Singular Price' },
  Lg_NettoSum: { pl: 'Suma Netto', en: 'Netto Sum' },
  Lg_Number: { pl: 'Nr', en: 'No.' },
  Lg_Original: { pl: 'Oryginał', en: 'Original' },
  Lg_PaidAmount: { pl: 'Zapłacono', en: 'Paid Amount' },
  Lg_PaymentDue: { pl: 'Termin Płatności:', en: 'Payment Due:' },
  Lg_PaymentType: { pl: 'Sposób Płatności:', en: 'Payment Type :' },
  Lg_PhoneNo: { pl: 'tel.', en: 'mob.' },
  Lg_PKWiU: { pl: 'PKWiU', en: '' },
  Lg_SaleDate: { pl: 'Data sprzedaży', en: 'Sale Date' },
  Lg_Seller: { pl: 'Sprzedawca', en: 'Seller' },
  Lg_SellerSig: {
    pl: 'imię, nazwisko i podpis osoby upoważnionej do wystawienia dokumentu',
    en: 'name, surname and signature of the issuer',
  },
  Lg_ServiceName: { pl: 'Nazwa', en: 'Name' },
  Lg_Sum: { pl: 'RAZEM', en: 'TOTAL' },
  Lg_Swift: { pl: 'SWIFT:', en: 'SWIFT' },
  Lg_Title: { pl: 'RACHUNEK', en: 'Invoice' },
  Lg_TobePaid: { pl: 'Razem do zapłaty', en: 'To be Paid' },
  Lg_VatAmount: { pl: 'Stawka VAT', en: 'VAT' },
};

const normalizeLanguage = (value: unknown): FilemakerInvoicePdfLanguage =>
  value === 'en' ? 'en' : 'pl';

const normalizeLabelValue = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const parseRawInvoicePdfSettings = (raw: string | null | undefined): unknown => {
  if (raw === null || raw === undefined || raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const createDefaultFilemakerInvoicePdfSettings = (): FilemakerInvoicePdfSettings => ({
  defaultLanguage: 'pl',
  labels: { ...defaultFilemakerInvoicePdfLabels },
});

export const normalizeFilemakerInvoicePdfSettings = (
  value: unknown
): FilemakerInvoicePdfSettings => {
  const input: Record<string, unknown> =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawLabels = input['labels'];
  const labelsInput =
    rawLabels !== null && typeof rawLabels === 'object' && !Array.isArray(rawLabels)
      ? (rawLabels as Partial<Record<FilemakerInvoicePdfLabelKey, Partial<FilemakerInvoicePdfLabelTranslations>>>)
      : {};

  const labels = Object.fromEntries(
    filemakerInvoicePdfLabelKeys.map((key) => {
      const fallback = defaultFilemakerInvoicePdfLabels[key];
      const current = labelsInput[key] ?? {};
      return [
        key,
        {
          pl: normalizeLabelValue(current.pl, fallback.pl),
          en: normalizeLabelValue(current.en, fallback.en),
        },
      ];
    })
  ) as Record<FilemakerInvoicePdfLabelKey, FilemakerInvoicePdfLabelTranslations>;

  return {
    defaultLanguage: normalizeLanguage(input['defaultLanguage']),
    labels,
  };
};

export const parseFilemakerInvoicePdfSettings = (
  raw: string | null | undefined
): FilemakerInvoicePdfSettings =>
  normalizeFilemakerInvoicePdfSettings(parseRawInvoicePdfSettings(raw));

export const getFilemakerInvoicePdfLabel = (
  settings: FilemakerInvoicePdfSettings,
  key: FilemakerInvoicePdfLabelKey,
  language: FilemakerInvoicePdfLanguage
): string => settings.labels[key][language];
