import { createRequire } from 'module';

import { NextRequest, NextResponse } from 'next/server';

import {
  badRequestError,
  configurationError,
  internalError,
} from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

type CaseResolverExportPdfRequest = {
  html?: unknown;
  filename?: unknown;
};

type PlaywrightPage = {
  setContent: (content: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) => Promise<void>;
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

const MAX_HTML_LENGTH = 1_500_000;

const getPlaywrightChromium = (): PlaywrightChromium => {
  const requireFn = createRequire(import.meta.url);
  const packageName = 'play' + 'wright';
  const moduleRef = requireFn(packageName) as { chromium?: PlaywrightChromium };
  if (!moduleRef.chromium || typeof moduleRef.chromium.launch !== 'function') {
    throw configurationError('Playwright Chromium runtime is not available.');
  }
  return moduleRef.chromium;
};

const normalizeHtml = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const sanitizePdfFilename = (value: unknown): string => {
  const base = typeof value === 'string' ? value.trim() : '';
  const withoutExtension = base.replace(/\.pdf$/i, '');
  const normalized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const safeBase = normalized.slice(0, 120) || 'case-resolver-document';
  return `${safeBase}.pdf`;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let payload: CaseResolverExportPdfRequest;
  try {
    payload = (await req.json()) as CaseResolverExportPdfRequest;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }

  const html = normalizeHtml(payload.html);
  if (!html) {
    throw badRequestError('html is required.');
  }
  if (html.length > MAX_HTML_LENGTH) {
    throw badRequestError('html payload is too large.');
  }

  const filename = sanitizePdfFilename(payload.filename);

  let browser: PlaywrightBrowser | null = null;
  let page: PlaywrightPage | null = null;
  try {
    const chromium = getPlaywrightChromium();
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }
    throw internalError(
      error instanceof Error ? error.message : 'Failed to export PDF document.'
    );
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
