import { type NextRequest } from 'next/server';

import {
  createFilemakerCvPdfResponse,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const normalizeCvId = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  let payload: unknown;
  try {
    payload = (await req.json()) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
  const body = payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const cvId = normalizeCvId(body['cvId']);
  if (cvId.length === 0) {
    throw badRequestError('cvId is required.');
  }
  return createFilemakerCvPdfResponse({ cvId });
}
