import { type NextRequest, NextResponse } from 'next/server';

import {
  readEcommercePagesCmsBackground,
  saveEcommercePagesCmsBackground,
  type EcommercePagesCmsBackgroundFields,
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

const readBackgroundBody = async (req: NextRequest): Promise<EcommercePagesCmsBackgroundFields> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseBackgroundBody',
    });
    throw badRequestError('Invalid background settings payload.');
  }

  const candidate = isRecord(body) && isRecord(body.background) ? body.background : body;
  if (!isRecord(candidate) || typeof candidate.cosmosParallaxEnabled !== 'boolean') {
    throw badRequestError('Background settings payload must include cosmosParallaxEnabled.');
  }

  return { cosmosParallaxEnabled: candidate.cosmosParallaxEnabled };
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json({
    ok: true,
    background: await readEcommercePagesCmsBackground(),
  });
}

export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const userId = assertAuthenticated(ctx);
  const result = await saveEcommercePagesCmsBackground({
    background: await readBackgroundBody(req),
    userId,
  });

  return NextResponse.json({ ok: true, background: result });
}
