import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import {
  getMongoFilemakerWebsiteById,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

const resolveWebsiteId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params['websiteId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : value;
  return decodeURIComponent(raw);
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const website = await getMongoFilemakerWebsiteById(resolveWebsiteId(ctx));
  if (!website) {
    throw notFoundError('Filemaker website was not found.');
  }
  return Response.json({ website });
}
