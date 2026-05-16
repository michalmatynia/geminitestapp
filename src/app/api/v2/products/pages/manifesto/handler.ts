import { type NextRequest, NextResponse } from 'next/server';

import {
  readEcommercePagesCmsManifesto,
  saveEcommercePagesCmsManifesto,
  type EcommercePagesCmsManifestoFields,
} from '@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const assertAuthenticated = (ctx: ApiHandlerContext): string => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) {
    throw authError('Unauthorized.');
  }
  return userId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readManifestoBody = async (req: NextRequest): Promise<EcommercePagesCmsManifestoFields> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseManifestoBody',
    });
    throw badRequestError('Invalid Collector Creed payload.');
  }

  const candidate = isRecord(body) && isRecord(body['manifesto']) ? body['manifesto'] : body;
  if (!isRecord(candidate)) throw badRequestError('Collector Creed payload must be an object.');
  return candidate as EcommercePagesCmsManifestoFields;
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json({
    ok: true,
    manifesto: await readEcommercePagesCmsManifesto(),
  });
}

export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const userId = assertAuthenticated(ctx);
  const result = await saveEcommercePagesCmsManifesto({
    manifesto: await readManifestoBody(req),
    userId,
  });

  return NextResponse.json({ ok: true, manifesto: result });
}
