import { type NextRequest, NextResponse } from 'next/server';

import {
  generateEcommercePagesCmsEditorialArticleWithAiPath,
  type EcommercePagesCmsEditorialArticleAiRequest,
} from '@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const assertAuthenticated = (ctx: ApiHandlerContext): void => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) throw authError('Unauthorized.');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readDraftString = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined;

const readDraft = (
  value: unknown
): EcommercePagesCmsEditorialArticleAiRequest['draft'] | undefined => {
  if (!isRecord(value)) return undefined;
  const body = readDraftString(value, 'body');
  const excerpt = readDraftString(value, 'excerpt');
  const tag = readDraftString(value, 'tag');
  const title = readDraftString(value, 'title');
  return {
    ...(body !== undefined ? { body } : {}),
    ...(excerpt !== undefined ? { excerpt } : {}),
    ...(tag !== undefined ? { tag } : {}),
    ...(title !== undefined ? { title } : {}),
  };
};

const readGenerateBody = async (
  req: NextRequest
): Promise<EcommercePagesCmsEditorialArticleAiRequest> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'products.pages-cms',
      action: 'parseEditorialArticleAiGenerateBody',
    });
    throw badRequestError('Invalid editorial article AI payload.');
  }

  if (!isRecord(body)) throw badRequestError('Editorial article AI payload must be an object.');
  const draft = readDraft(body['draft']);
  const imageUrl = typeof body['imageUrl'] === 'string' ? body['imageUrl'] : undefined;
  return {
    ...(draft !== undefined ? { draft } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    prompt: typeof body['prompt'] === 'string' ? body['prompt'] : '',
  };
};

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  assertAuthenticated(ctx);
  const article = await generateEcommercePagesCmsEditorialArticleWithAiPath(
    await readGenerateBody(req)
  );
  return NextResponse.json({ ok: true, article });
}
