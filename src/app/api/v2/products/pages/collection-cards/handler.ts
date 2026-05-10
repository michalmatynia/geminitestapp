import { type NextRequest, NextResponse } from 'next/server';

import {
  readEcommercePagesCmsCollectionCards,
  saveEcommercePagesCmsCollectionCards,
  type EcommercePagesCmsCollectionCard,
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

const readCardsBody = async (req: NextRequest): Promise<EcommercePagesCmsCollectionCard[]> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseCollectionCardsBody',
    });
    throw badRequestError('Invalid collection cards payload.');
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('cards' in body)) {
    throw badRequestError('Collection cards payload must include cards.');
  }

  return (body as { cards: EcommercePagesCmsCollectionCard[] }).cards;
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json({
    ok: true,
    collectionCards: await readEcommercePagesCmsCollectionCards(),
  });
}

export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const userId = assertAuthenticated(ctx);
  const result = await saveEcommercePagesCmsCollectionCards({
    cards: await readCardsBody(req),
    userId,
  });

  return NextResponse.json({ ok: true, collectionCards: result });
}
