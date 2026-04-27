import { type NextRequest } from 'next/server';

import {
  createFilemakerInvoicePdfResponse,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const normalizeInvoiceId = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeLanguage = (value: unknown): 'pl' | 'en' | null => {
  if (value === 'pl' || value === 'en') return value;
  return null;
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  let payload: unknown;
  try {
    payload = (await req.json()) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
  const body = payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const invoiceId = normalizeInvoiceId(body['invoiceId']);
  if (invoiceId.length === 0) {
    throw badRequestError('invoiceId is required.');
  }

  return createFilemakerInvoicePdfResponse({
    invoiceId,
    language: normalizeLanguage(body['language']),
  });
}
