export const runtime = 'nodejs';


import { postHandler as postAccept } from '@/app/api/v2/products/[id]/studio/handlers/accept';
import { getHandler as getAudit } from '@/app/api/v2/products/[id]/studio/handlers/audit';
import { postHandler as postLink } from '@/app/api/v2/products/[id]/studio/handlers/link';
import { getHandler as getPreflight } from '@/app/api/v2/products/[id]/studio/handlers/preflight';
import { postHandler as postRotate } from '@/app/api/v2/products/[id]/studio/handlers/rotate';
import { postHandler as postSend } from '@/app/api/v2/products/[id]/studio/handlers/send';
import { getHandler as getVariants } from '@/app/api/v2/products/[id]/studio/handlers/variants';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

type StudioActionParams = { id: string; action: string };

export const GET = apiHandlerWithParams<StudioActionParams>(
  async (req, ctx, params) => {
    const { action } = params;
    if (action === 'audit') return getAudit(req, ctx, params);
    if (action === 'variants') return getVariants(req, ctx, params);
    if (action === 'preflight') return getPreflight(req, ctx, params);

    throw badRequestError(`Invalid studio action for GET: ${action}`);
  },
  { source: 'v2.products.[id].studio.[action].GET', requireAuth: true }
);

export const POST = apiHandlerWithParams<StudioActionParams>(
  async (req, ctx, params) => {
    const { action } = params;
    if (action === 'rotate') return postRotate(req, ctx, params);
    if (action === 'accept') return postAccept(req, ctx, params);
    if (action === 'send') return postSend(req, ctx, params);
    if (action === 'link') return postLink(req, ctx, params);

    throw badRequestError(`Invalid studio action for POST: ${action}`);
  },
  { source: 'v2.products.[id].studio.[action].POST', logSuccess: true, requireAuth: true }
);
