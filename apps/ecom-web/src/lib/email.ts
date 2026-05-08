import { Resend } from 'resend';
import type { Order } from '@/lib/orders';

const DEFAULT_FROM = 'ARCANA <orders@arcana.store>';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(amount: number): string {
  return `EUR ${Math.round(amount).toLocaleString('de-DE')}`;
}

function buildConfirmationHtml(order: Order): string {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2b2b2b;">
            <div style="font-size:15px;color:#f5f1e8;">${escapeHtml(item.name)}</div>
            <div style="font-size:12px;color:#9f9a90;margin-top:4px;">${escapeHtml(item.category)} / ${escapeHtml(item.size)} x ${item.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #2b2b2b;text-align:right;color:#f5f1e8;font-size:14px;">
            ${formatMoney(item.price * item.quantity)}
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <div style="margin:0;padding:0;background:#090909;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
        <p style="letter-spacing:0.24em;text-transform:uppercase;color:#b6aa94;font-size:12px;margin:0 0 20px;">ARCANA</p>
        <h1 style="font-weight:400;font-size:28px;line-height:1.25;margin:0 0 12px;color:#f5f1e8;">Order confirmed</h1>
        <p style="color:#c8c1b5;font-size:15px;line-height:1.7;margin:0 0 28px;">
          Thank you for your order. We have received ${escapeHtml(order.orderId)} and are preparing it now.
        </p>

        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;margin-bottom:24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tbody>${itemRows}</tbody>
          </table>
          <div style="padding-top:18px;">
            <div style="display:flex;justify-content:space-between;color:#9f9a90;font-size:14px;margin-bottom:8px;">
              <span>Shipping</span><span>${escapeHtml(order.shippingMethod)} (${formatMoney(order.shippingPrice)})</span>
            </div>
            ${
              order.discount > 0
                ? `<div style="display:flex;justify-content:space-between;color:#8db281;font-size:14px;margin-bottom:8px;"><span>Discount${order.promoCode ? ` (${escapeHtml(order.promoCode)})` : ''}</span><span>-${formatMoney(order.discount)}</span></div>`
                : ''
            }
            <div style="display:flex;justify-content:space-between;color:#f5f1e8;font-size:18px;padding-top:12px;border-top:1px solid #2b2b2b;">
              <span>Total</span><strong>${formatMoney(order.total)}</strong>
            </div>
          </div>
        </div>

        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;margin-bottom:24px;">
          <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9f9a90;margin:0 0 12px;">Shipping to</p>
          <p style="font-size:14px;color:#c8c1b5;line-height:1.8;margin:0;">
            ${escapeHtml(`${order.shippingAddress['firstName'] ?? ''} ${order.shippingAddress['lastName'] ?? ''}`.trim())}<br>
            ${escapeHtml(order.shippingAddress['address'] ?? '')}<br>
            ${[order.shippingAddress['city'], order.shippingAddress['postcode']].filter(Boolean).map(escapeHtml).join(', ')}<br>
            ${escapeHtml(order.shippingAddress['country'] ?? '')}
            ${
              order.inpostPoint
                ? `<br><br><strong style="color:#f5f1e8;">InPost:</strong> ${escapeHtml(order.inpostPoint.name)}${order.inpostPoint.addressLine1 ? `<br>${escapeHtml(order.inpostPoint.addressLine1)}` : ''}`
                : ''
            }
            ${order.inpostShipment?.trackingNumber ? `<br><br>Tracking: ${escapeHtml(order.inpostShipment.trackingNumber)}` : ''}
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
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not configured; skipping order confirmation email.');
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM,
    to: order.email,
    subject: `Order confirmed - ${order.orderId}`,
    html: buildConfirmationHtml(order),
  });
}
