export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { badRequestError } from '@/shared/errors/app-error';

import { POST_handler as postRotate } from '@/app/api/products/[id]/studio/handlers/rotate';
import { POST_handler as postAccept } from '@/app/api/products/[id]/studio/handlers/accept';
import { POST_handler as postSend } from '@/app/api/products/[id]/studio/handlers/send';
import { POST_handler as postLink } from '@/app/api/products/[id]/studio/handlers/link';
import { GET_handler as getAudit } from '@/app/api/products/[id]/studio/handlers/audit';
import { GET_handler as getVariants } from '@/app/api/products/[id]/studio/handlers/variants';
import { GET_handler as getPreflight } from '@/app/api/products/[id]/studio/handlers/preflight';

type StudioActionParams = { id: string; action: string };

export const GET = apiHandlerWithParams<StudioActionParams>(
  async (req, ctx, params) => {
    const { action } = params;
    if (action === 'audit') return getAudit(req, ctx, params);
    if (action === 'variants') return getVariants(req, ctx, params);
    if (action === 'preflight') return getPreflight(req, ctx, params);

    throw badRequestError(`Invalid studio action for GET: ${action}`);
  },
  { source: 'products.[id].studio.[action].GET' }
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
  { source: 'products.[id].studio.[action].POST', logSuccess: true }
);
