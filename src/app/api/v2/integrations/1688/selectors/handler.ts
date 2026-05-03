import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';

import {
  cloneSupplier1688SelectorRegistryProfile,
  deleteSupplier1688SelectorRegistryEntry,
  deleteSupplier1688SelectorRegistryProfile,
  listSupplier1688SelectorRegistry,
  renameSupplier1688SelectorRegistryProfile,
  saveSupplier1688SelectorRegistryEntry,
  syncSupplier1688SelectorRegistryFromCode,
} from '@/features/integrations/services/supplier-1688-selector-registry';
import {
  type Supplier1688SelectorRegistryProfileActionResponse,
  supplier1688SelectorRegistryDeleteRequestSchema,
  supplier1688SelectorRegistryProfileActionRequestSchema,
  supplier1688SelectorRegistrySaveRequestSchema,
  supplier1688SelectorRegistrySyncRequestSchema,
} from '@/shared/contracts/integrations/supplier-1688-selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  supplier1688SelectorRegistryDeleteRequestSchema,
  supplier1688SelectorRegistryProfileActionRequestSchema,
  supplier1688SelectorRegistrySaveRequestSchema,
  supplier1688SelectorRegistrySyncRequestSchema,
};

export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const response = await listSupplier1688SelectorRegistry({
    profile: request.nextUrl.searchParams.get('profile'),
  });
  return NextResponse.json(response);
}

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = (ctx.body ?? {}) as z.infer<typeof supplier1688SelectorRegistrySyncRequestSchema>;
  const response = await syncSupplier1688SelectorRegistryFromCode({
    profile: body.profile,
  });
  return NextResponse.json(response);
}

export async function putHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof supplier1688SelectorRegistrySaveRequestSchema>;
  const response = await saveSupplier1688SelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function deleteHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof supplier1688SelectorRegistryDeleteRequestSchema>;
  const response = await deleteSupplier1688SelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function patchHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof supplier1688SelectorRegistryProfileActionRequestSchema>;

  let response: Supplier1688SelectorRegistryProfileActionResponse;
  if (body.action === 'clone_profile') {
    response = await cloneSupplier1688SelectorRegistryProfile(body);
  } else if (body.action === 'rename_profile') {
    response = await renameSupplier1688SelectorRegistryProfile(body);
  } else {
    response = await deleteSupplier1688SelectorRegistryProfile(body);
  }

  return NextResponse.json(response);
}

