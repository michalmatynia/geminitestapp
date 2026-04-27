import { type NextRequest } from 'next/server';

import {
  createPdfDownloadResponse,
  renderHtmlToPdfBuffer,
  sanitizePdfFilename,
} from '@/features/pdf-export/server';
import { caseResolverPdfExportRequestSchema } from '@/shared/contracts/case-resolver/file';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  badRequestError,
  internalError,
  isAppError,
} from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const MAX_HTML_LENGTH = 1_500_000;

const normalizeHtml = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
  if (html.length === 0) {
    throw badRequestError('html is required.');
  }
  if (html.length > MAX_HTML_LENGTH) {
    throw badRequestError('html payload is too large.');
  }

  const filename = sanitizePdfFilename(parsedRequest.data.filename, 'case-resolver-document');

  try {
    const pdfBuffer = await renderHtmlToPdfBuffer({ html });
    return createPdfDownloadResponse({
      filename,
      pdfBuffer,
    });
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    if (isAppError(error)) {
      throw error;
    }
    throw internalError(error instanceof Error ? error.message : 'Failed to export PDF document.');
  }
}
