import { Resend } from 'resend';
import { formatPrice } from '@/lib/locales';
import { getOrderShippingDetails } from '@/lib/order-shipping';
import { isPolandShippingCountry } from '@/lib/shipping';
import type { Order } from '@/lib/orders';

const DEFAULT_FROM = 'STARGATER <orders@arcana.store>';
const EMAIL_PRICE_LOCALE = 'pl';
const PUBLIC_BASE_URL_CANDIDATES = ['NEXT_PUBLIC_ECOM_URL', 'NEXT_PUBLIC_BASE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function orderCurrencyCode(order: Order): string {
  return order.items.find((item) => (item.currencyCode ?? '').trim() !== '')?.currencyCode ?? 'PLN';
}

function formatMoney(amount: number, currencyCode: string): string {
  return formatPrice(amount, EMAIL_PRICE_LOCALE, currencyCode);
}

function normalizePublicBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function getPublicBaseUrl(): string {
  for (const envName of PUBLIC_BASE_URL_CANDIDATES) {
    const normalized = normalizePublicBaseUrl(process.env[envName]);
    if (normalized.length > 0) return normalized;
  }
  return '';
}

function buildOrderStatusUrl(order: Order): string {
  const baseUrl = getPublicBaseUrl();
  if (baseUrl.length === 0) return '';
  const localePrefix = isPolandShippingCountry(order.shippingAddress['country']) ? '/pl' : '';
  return `${baseUrl}${localePrefix}/order-status?order=${encodeURIComponent(order.orderId)}`;
}

function buildShippingDetailsHtml(order: Order): string {
  const detailRows = getOrderShippingDetails(order, 'en');
  if (detailRows.length === 0) return '';

  return `<br><br><strong style="color:#f5f1e8;">Delivery:</strong><br>${detailRows.map(escapeHtml).join('<br>')}`;
}

function buildOrderStatusLinkHtml(order: Order): string {
  const orderStatusUrl = buildOrderStatusUrl(order);
  if (orderStatusUrl.length === 0) return '';
  return `<p style="margin:0 0 28px;"><a href="${escapeHtml(orderStatusUrl)}" style="display:inline-block;border:1px solid #f5f1e8;color:#f5f1e8;text-decoration:none;padding:12px 18px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Track order</a></p>`;
}

function buildDiscountHtml(order: Order, currencyCode: string): string {
  if (order.discount <= 0) return '';
  const promoLabel = order.promoCode !== undefined && order.promoCode.length > 0
    ? ` (${escapeHtml(order.promoCode)})`
    : '';
  return `<div style="display:flex;justify-content:space-between;color:#8db281;font-size:14px;margin-bottom:8px;"><span>Discount${promoLabel}</span><span>-${formatMoney(order.discount, currencyCode)}</span></div>`;
}

// eslint-disable-next-line max-lines-per-function
function buildConfirmationHtml(order: Order): string {
  const currencyCode = orderCurrencyCode(order);
  const shippingDetailsHtml = buildShippingDetailsHtml(order);
  const orderStatusLinkHtml = buildOrderStatusLinkHtml(order);
  const discountHtml = buildDiscountHtml(order, currencyCode);
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2b2b2b;">
            <div style="font-size:15px;color:#f5f1e8;">${escapeHtml(item.name)}</div>
            <div style="font-size:12px;color:#9f9a90;margin-top:4px;">${escapeHtml(item.category)} / ${escapeHtml(item.size)} x ${item.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #2b2b2b;text-align:right;color:#f5f1e8;font-size:14px;">
            ${formatMoney(item.price * item.quantity, item.currencyCode ?? currencyCode)}
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <div style="margin:0;padding:0;background:#090909;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
        <p style="letter-spacing:0.24em;text-transform:uppercase;color:#b6aa94;font-size:12px;margin:0 0 20px;">STARGATER</p>
        <h1 style="font-weight:400;font-size:28px;line-height:1.25;margin:0 0 12px;color:#f5f1e8;">Order confirmed</h1>
        <p style="color:#c8c1b5;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Thank you for your order. We have received ${escapeHtml(order.orderId)} and are preparing it now.
        </p>
        ${orderStatusLinkHtml}

        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;margin-bottom:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tbody>${itemRows}</tbody>
          </table>
          <div style="padding-top:18px;">
            <div style="display:flex;justify-content:space-between;color:#9f9a90;font-size:14px;margin-bottom:8px;">
              <span>Shipping</span><span>${escapeHtml(order.shippingMethod)} (${formatMoney(order.shippingPrice, currencyCode)})</span>
            </div>
            ${discountHtml}
            <div style="display:flex;justify-content:space-between;color:#f5f1e8;font-size:18px;padding-top:12px;border-top:1px solid #2b2b2b;">
              <span>Total</span><strong>${formatMoney(order.total, currencyCode)}</strong>
            </div>
          </div>
        </div>

        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;margin-bottom:24px;">
          <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9f9a90;margin:0 0 12px;">Shipping to</p>
          <p style="font-size:14px;color:#c8c1b5;line-height:1.8;margin:0;">
            ${escapeHtml(`${order.shippingAddress['firstName'] ?? ''} ${order.shippingAddress['lastName'] ?? ''}`.trim())}<br>
            ${escapeHtml(order.shippingAddress['address'] ?? '')}<br>
            ${[order.shippingAddress['city'], order.shippingAddress['postcode']]
              .filter((value): value is string => typeof value === 'string' && value.length > 0)
              .map(escapeHtml)
              .join(', ')}<br>
            ${escapeHtml(order.shippingAddress['country'] ?? '')}
            ${shippingDetailsHtml}
          </p>
        </div>

        <p style="color:#9f9a90;font-size:13px;line-height:1.7;margin:0;">
          We will send another update when your order is on its way.
        </p>
      </div>
    </div>
  `;
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) {
    // Email service is unavailable until RESEND_API_KEY is configured.
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const from = fromEmail === undefined || fromEmail.length === 0 ? DEFAULT_FROM : fromEmail;
  await resend.emails.send({
    from,
    to: order.email,
    subject: `Order confirmed - ${order.orderId}`,
    html: buildConfirmationHtml(order),
  });
}
