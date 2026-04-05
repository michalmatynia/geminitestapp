import { createRequire } from 'module';

import { NextRequest, NextResponse } from 'next/server';

import { caseResolverPdfExportRequestSchema } from '@/shared/contracts/case-resolver/file';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  badRequestError,
  configurationError,
  internalError,
  isAppError,
} from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


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

const MAX_HTML_LENGTH = 1_500_000;

const getPlaywrightChromium = (): PlaywrightChromium => {
  const requireFn = createRequire(import.meta.url);
  const moduleRef = requireFn('playwright') as { chromium?: PlaywrightChromium };
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
  const resolved = normalizedNoControl || normalized;
  const safeBase = resolved.slice(0, 120) || 'case-resolver-document';
  return `${safeBase}.pdf`;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let rawPayload: unknown;
  try {
    rawPayload = (await req.json()) as unknown;
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON payload.');
  }
  const parsedRequest = caseResolverPdfExportRequestSchema.safeParse(rawPayload);
  if (!parsedRequest.success) {
    throw badRequestError('Invalid PDF export payload.', { errors: parsedRequest.error.format() });
  }

  const html = normalizeHtml(parsedRequest.data.html);
  if (!html) {
    throw badRequestError('html is required.');
  }
  if (html.length > MAX_HTML_LENGTH) {
    throw badRequestError('html payload is too large.');
  }

  const filename = sanitizePdfFilename(parsedRequest.data.filename);

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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    if (isAppError(error)) {
      throw error;
    }
    throw internalError(error instanceof Error ? error.message : 'Failed to export PDF document.');
  } finally {
    await page?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
