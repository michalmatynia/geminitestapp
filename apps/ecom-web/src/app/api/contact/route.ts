import { type NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 200;

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

function buildContactEmailHtml(name: string, email: string, subject: string, message: string): string {
  const lines = message.split('\n').map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`).join('');
  return `
    <div style="margin:0;padding:0;background:#090909;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
        <p style="letter-spacing:0.24em;text-transform:uppercase;color:#b6aa94;font-size:12px;margin:0 0 20px;">STARGATER</p>
        <h1 style="font-weight:400;font-size:22px;line-height:1.25;margin:0 0 24px;color:#f5f1e8;">New contact message</h1>
        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;margin-bottom:20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #2b2b2b;color:#9f9a90;font-size:13px;width:80px;">Name</td><td style="padding:8px 0 8px 16px;border-bottom:1px solid #2b2b2b;color:#f5f1e8;font-size:14px;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #2b2b2b;color:#9f9a90;font-size:13px;">Email</td><td style="padding:8px 0 8px 16px;border-bottom:1px solid #2b2b2b;color:#f5f1e8;font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#abd9d0;">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding:8px 0;color:#9f9a90;font-size:13px;">Subject</td><td style="padding:8px 0 8px 16px;color:#f5f1e8;font-size:14px;">${escapeHtml(subject)}</td></tr>
          </table>
        </div>
        <div style="border:1px solid #2b2b2b;background:#111;padding:24px;">
          <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9f9a90;margin:0 0 16px;">Message</p>
          <div style="font-size:14px;color:#c8c1b5;line-height:1.8;">${lines}</div>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const name = readString(body['name'], MAX_NAME_LENGTH);
  const email = readString(body['email'], 320);
  const subject = readString(body['subject'], MAX_SUBJECT_LENGTH);
  const message = readString(body['message'], MAX_MESSAGE_LENGTH);

  if (name.length === 0) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  if (subject.length === 0) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: 'Message is too short.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // No email service configured — acknowledge without sending.
    return NextResponse.json({ ok: true });
  }

  const toEmail = process.env.RESEND_CONTACT_EMAIL?.trim() ?? process.env.RESEND_FROM_EMAIL?.trim();
  if (!toEmail) {
    return NextResponse.json({ ok: true });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const from = fromEmail ? `STARGATER <${fromEmail}>` : 'STARGATER <orders@arcana.store>';

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: toEmail,
      replyTo: email,
      subject: `Contact: ${subject}`,
      html: buildContactEmailHtml(name, email, subject, message),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to send message. Please try again later.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
