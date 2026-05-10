import { type NextRequest, NextResponse } from 'next/server';

import {
  readEcommercePagesCmsEditorialArticles,
  saveEcommercePagesCmsEditorialArticles,
  type EcommercePagesCmsEditorialArticle,
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

const readArticlesBody = async (
  req: NextRequest
): Promise<EcommercePagesCmsEditorialArticle[]> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseEditorialArticlesBody',
    });
    throw badRequestError('Invalid editorial articles payload.');
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body) || !('articles' in body)) {
    throw badRequestError('Editorial articles payload must include articles.');
  }

  return (body as { articles: EcommercePagesCmsEditorialArticle[] }).articles;
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  return NextResponse.json({
    ok: true,
    editorialArticles: await readEcommercePagesCmsEditorialArticles(),
  });
}

export async function putHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  const userId = assertAuthenticated(ctx);
  const result = await saveEcommercePagesCmsEditorialArticles({
    articles: await readArticlesBody(req),
    userId,
  });

  return NextResponse.json({ ok: true, editorialArticles: result });
}
