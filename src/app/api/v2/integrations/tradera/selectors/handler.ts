import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';

import {
  cloneTraderaSelectorRegistryProfile,
  deleteTraderaSelectorRegistryEntry,
  deleteTraderaSelectorRegistryProfile,
  listTraderaSelectorRegistry,
  renameTraderaSelectorRegistryProfile,
  saveTraderaSelectorRegistryEntry,
  syncTraderaSelectorRegistryFromCode,
} from '@/features/integrations/services/tradera-selector-registry';
import {
  type TraderaSelectorRegistryProfileActionResponse,
  traderaSelectorRegistryDeleteRequestSchema,
  traderaSelectorRegistryProfileActionRequestSchema,
  traderaSelectorRegistrySaveRequestSchema,
  traderaSelectorRegistrySyncRequestSchema,
} from '@/shared/contracts/integrations/tradera-selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  traderaSelectorRegistryDeleteRequestSchema,
  traderaSelectorRegistryProfileActionRequestSchema,
  traderaSelectorRegistrySaveRequestSchema,
  traderaSelectorRegistrySyncRequestSchema,
};

export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const response = await listTraderaSelectorRegistry({
    profile: request.nextUrl.searchParams.get('profile'),
  });
  return NextResponse.json(response);
}

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = (ctx.body ?? {}) as z.infer<typeof traderaSelectorRegistrySyncRequestSchema>;
  const response = await syncTraderaSelectorRegistryFromCode({
    profile: body.profile,
  });
  return NextResponse.json(response);
}

export async function putHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof traderaSelectorRegistrySaveRequestSchema>;
  const response = await saveTraderaSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function deleteHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof traderaSelectorRegistryDeleteRequestSchema>;
  const response = await deleteTraderaSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function patchHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof traderaSelectorRegistryProfileActionRequestSchema>;

  let response: TraderaSelectorRegistryProfileActionResponse;
  if (body.action === 'clone_profile') {
    response = await cloneTraderaSelectorRegistryProfile(body);
  } else if (body.action === 'rename_profile') {
    response = await renameTraderaSelectorRegistryProfile(body);
  } else {
    response = await deleteTraderaSelectorRegistryProfile(body);
  }

  return NextResponse.json(response);
}
