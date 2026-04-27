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
