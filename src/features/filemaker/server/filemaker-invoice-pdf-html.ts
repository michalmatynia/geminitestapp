import type {
  FilemakerInvoicePdfLabelKey,
  FilemakerInvoicePdfLanguage,
} from '../filemaker-invoice-pdf-settings';

export type InvoiceParty = {
  address: string;
  name: string;
  taxId: string;
};

export type InvoicePdfServiceLine = {
  amount: string;
  brutto: string;
  currency: string;
  name: string;
  netto: string;
  tax: string;
};

export type InvoicePdfTotals = {
  bruttoTotal: string;
  leftForPayment: string;
  nettoTotal: string;
  paidAmount: string;
};

export type InvoicePdfLabelResolver = (key: FilemakerInvoicePdfLabelKey) => string;

export type RenderInvoiceHtmlInput = {
  buyer: InvoiceParty;
  currency: string;
  invoice: {
    eventDate: string | null | undefined;
    issueDate: string | null | undefined;
    number: string;
    paymentDue: string;
    paymentType: string | null | undefined;
  };
  label: InvoicePdfLabelResolver;
  language: FilemakerInvoicePdfLanguage;
  seller: InvoiceParty;
  serviceLines: InvoicePdfServiceLine[];
  totals: InvoicePdfTotals;
};

type InvoiceRenderSectionInput = Omit<RenderInvoiceHtmlInput, 'language'>;

const INVOICE_PDF_STYLES = `
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
`;

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const html = (value: string | null | undefined): string => escapeHtml(normalizeText(value));

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

const renderInvoiceHeader = ({
  invoice,
  label,
}: Pick<InvoiceRenderSectionInput, 'invoice' | 'label'>): string => `
    <section class="header">
      <div>
        <div class="title">${html(label('Lg_Title'))}</div>
        <div class="muted">${html(label('Lg_Original'))}</div>
      </div>
      <div class="meta">
        <div><strong>${html(label('Lg_Number'))}</strong> ${html(invoice.number)}</div>
        <div><strong>${html(label('Lg_IssueDate'))}</strong> ${html(invoice.issueDate)}</div>
        <div><strong>${html(label('Lg_SaleDate'))}</strong> ${html(invoice.eventDate)}</div>
        <div><strong>${html(label('Lg_PaymentDue'))}</strong> ${html(invoice.paymentDue)}</div>
        <div><strong>${html(label('Lg_PaymentType'))}</strong> ${html(invoice.paymentType)}</div>
      </div>
    </section>`;

const renderPartyBox = (title: string, party: InvoiceParty): string => `
      <div class="box">
        <div class="box-title">${html(title)}</div>
        <div class="party-name">${html(party.name)}</div>
        <div>${html(party.address)}</div>
        <div class="muted">NIP: ${html(party.taxId)}</div>
      </div>`;

const renderInvoiceParties = ({
  buyer,
  label,
  seller,
}: Pick<InvoiceRenderSectionInput, 'buyer' | 'label' | 'seller'>): string => `
    <section class="grid">
      ${renderPartyBox(label('Lg_Seller'), seller)}
      ${renderPartyBox(label('Lg_Buyer'), buyer)}
    </section>`;

const renderInvoiceServiceTable = ({
  label,
  serviceLines,
}: Pick<InvoiceRenderSectionInput, 'label' | 'serviceLines'>): string => `
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
    </table>`;

const renderInvoiceTotals = ({
  currency,
  label,
  totals,
}: Pick<InvoiceRenderSectionInput, 'currency' | 'label' | 'totals'>): string => `
    <section class="totals">
      <div class="total-row"><span>${html(label('Lg_NettoSum'))}</span><strong>${html(totals.nettoTotal)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_BruttoAmount'))}</span><strong>${html(totals.bruttoTotal)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_PaidAmount'))}</span><strong>${html(totals.paidAmount)} ${html(currency)}</strong></div>
      <div class="total-row"><span>${html(label('Lg_LeftForPayment'))}</span><strong>${html(totals.leftForPayment)} ${html(currency)}</strong></div>
      <div class="total-row strong"><span>${html(label('Lg_TobePaid'))}</span><span>${html(totals.leftForPayment)} ${html(currency)}</span></div>
    </section>`;

const renderInvoiceFooter = ({
  label,
  seller,
}: Pick<InvoiceRenderSectionInput, 'label' | 'seller'>): string => `
    <section class="box" style="margin-top: 22px;">
      <div class="box-title">${html(label('Lg_BankDetails'))}</div>
      <div>${html(label('Lg_AccountNo'))}: ${html(seller.name)}</div>
      <div>${html(label('Lg_Swift'))}</div>
    </section>

    <section class="signatures">
      <div class="signature">${html(label('Lg_SellerSig'))}</div>
      <div class="signature">${html(label('Lg_BuyerSig'))}</div>
    </section>`;

export const renderInvoiceHtmlDocument = ({
  buyer,
  currency,
  invoice,
  label,
  language,
  seller,
  serviceLines,
  totals,
}: RenderInvoiceHtmlInput): string => `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <style>${INVOICE_PDF_STYLES}</style>
  </head>
  <body>
    ${renderInvoiceHeader({ invoice, label })}
    ${renderInvoiceParties({ buyer, label, seller })}
    ${renderInvoiceServiceTable({ label, serviceLines })}
    ${renderInvoiceTotals({ currency, label, totals })}
    ${renderInvoiceFooter({ label, seller })}
  </body>
</html>`;
