import { NextRequest } from 'next/server';
import { POST_handler as postRotate } from './handlers/rotate';
import { GET_handler as getVariants, POST_handler as postVariants } from './handlers/variants';
import { POST_handler as postAccept } from './handlers/accept';
import { POST_handler as postAudit } from './handlers/audit';
import { POST_handler as postLink } from './handlers/link';
import { POST_handler as postSend } from './handlers/send';
import { GET_handler as getPreflight } from './handlers/preflight';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function studio_action_handler(
  req: NextRequest, 
  ctx: ApiHandlerContext,
  params: { id: string, action: string }
): Promise<Response> {
  const { action, id } = params;
  const p = { id };
  
  if (req.method === 'GET') {
    if (action === 'variants') return getVariants(req, ctx, p);
    if (action === 'preflight') return getPreflight(req, ctx, p);
  }
  
  if (req.method === 'POST') {
    if (action === 'rotate') return postRotate(req, ctx, p);
    if (action === 'variants') return postVariants(req, ctx, p);
    if (action === 'accept') return postAccept(req, ctx, p);
    if (action === 'audit') return postAudit(req, ctx, p);
    if (action === 'link') return postLink(req, ctx, p);
    if (action === 'send') return postSend(req, ctx, p);
  }

  throw badRequestError(`Invalid studio action: ${action} for method ${req.method}`);
}
