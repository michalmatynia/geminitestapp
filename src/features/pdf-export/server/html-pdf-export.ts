import 'server-only';

import { createRequire } from 'module';

import { NextResponse } from 'next/server';

import { configurationError } from '@/shared/errors/app-error';

type PlaywrightPage = {
  setContent: (
    content: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
  ) => Promise<void>;
  pdf: (options: {
    format: 'A4';
    printBackground: boolean;
    preferCSSPageSize: boolean;
  }) => Promise<Buffer>;
  close: () => Promise<void>;
};

type PlaywrightBrowser = {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};

type PlaywrightChromium = {
  launch: (options: { headless: boolean }) => Promise<PlaywrightBrowser>;
};

export type HtmlPdfExportOptions = {
  html: string;
};

export type PdfDownloadResponseInput = {
  filename: string;
  pdfBuffer: Buffer | Uint8Array;
};

const decodeBasicHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'');

const htmlToFallbackPdfText = (html: string): string =>
  decodeBasicHtmlEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<\/(h1|h2|h3|h4|p|li|div|section|article|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );

const toPdfAsciiText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const wrapFallbackPdfLine = (line: string, maxLength: number): string[] => {
  const words = line.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  words.forEach((word: string): void => {
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }
    if (current.length > 0) lines.push(current);
    current = word;
  });
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [''];
};

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const createFallbackPdfBuffer = (html: string): Buffer => {
  const result = toPdfAsciiText(htmlToFallbackPdfText(html));
  const sourceText = result !== '' ? result : 'Document export';
  const lines = sourceText
    .split('\n')
    .flatMap((line: string): string[] =>
      line.trim().length > 0 ? wrapFallbackPdfLine(line.trim(), 88) : ['']
    )
    .slice(0, 68);
  const content = [
    'BT',
    '/F1 10 Tf',
    '50 800 Td',
    '14 TL',
    ...lines.map((line: string): string => `(${escapePdfText(line)}) Tj T*`),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object: string): void => {
    offsets.push(Buffer.byteLength(body, 'ascii'));
    body += object;
  });
  const xrefOffset = Buffer.byteLength(body, 'ascii');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset: number): void => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, 'ascii');
};

const getPlaywrightChromium = (): PlaywrightChromium => {
  const requireFn = createRequire(import.meta.url);
  const moduleRef = requireFn('playwright') as { chromium?: PlaywrightChromium };
  if (!moduleRef.chromium || typeof moduleRef.chromium.launch !== 'function') {
    throw configurationError('Playwright Chromium runtime is not available.');
  }
  return moduleRef.chromium;
};

export const sanitizePdfFilename = (value: unknown, fallback = 'document'): string => {
  const base = typeof value === 'string' ? value.trim() : '';
  const withoutControlChars = Array.from(base)
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');
  const withoutExtension = base.replace(/\.pdf$/i, '');
  const withoutExtensionNoControl = withoutControlChars.replace(/\.pdf$/i, '');
  const normalized = withoutExtension
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedNoControl = withoutExtensionNoControl
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let resolved = fallback;
  if (normalized.length > 0) resolved = normalized;
  if (normalizedNoControl.length > 0) resolved = normalizedNoControl;
  const sliced = resolved.slice(0, 120);
  const safeBase = sliced.length > 0 ? sliced : fallback;
  return `${safeBase}.pdf`;
};

export async function renderHtmlToPdfBuffer(input: HtmlPdfExportOptions): Promise<Buffer> {
  let browser: PlaywrightBrowser | null = null;
  let page: PlaywrightPage | null = null;
  try {
    const chromium = getPlaywrightChromium();
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.setContent(input.html, { waitUntil: 'load' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
  } catch {
    return createFallbackPdfBuffer(input.html);
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

export const createPdfDownloadResponse = (
  input: PdfDownloadResponseInput
): NextResponse<Uint8Array> =>
  new NextResponse(new Uint8Array(input.pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${sanitizePdfFilename(input.filename)}"`,
      'Cache-Control': 'no-store',
    },
  });
