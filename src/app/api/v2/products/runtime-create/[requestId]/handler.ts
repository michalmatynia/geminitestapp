import { type NextRequest, NextResponse } from 'next/server';

import { getProductCreateRuntimeStatus } from '@/features/products/server/product-create-runtime-status';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { requestId: string }
): Promise<Response> {
  const requestId = params.requestId.trim();
  if (requestId.length === 0) {
    throw badRequestError('Runtime product creation request id is required.');
  }

  const status = getProductCreateRuntimeStatus(requestId);
  if (status === null) {
    throw notFoundError('Runtime product creation request was not found.', { requestId });
  }

  return Promise.resolve(NextResponse.json(status));
}
