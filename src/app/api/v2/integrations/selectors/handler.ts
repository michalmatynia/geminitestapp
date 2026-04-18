import { NextResponse, type NextRequest } from 'next/server';

import {
  deleteSelectorRegistryEntry,
  listSelectorRegistry,
  mutateSelectorRegistryProfile,
  saveSelectorRegistryEntry,
  syncSelectorRegistryFromCode,
} from '@/features/integrations/services/selector-registry';
import {
  selectorRegistryDeleteRequestSchema,
  selectorRegistryNamespaceSchema,
  selectorRegistryProfileActionRequestSchema,
  selectorRegistrySaveRequestSchema,
  selectorRegistrySyncRequestSchema,
  type SelectorRegistryDeleteRequest,
  type SelectorRegistryListRequest,
  type SelectorRegistryProfileActionRequest,
  type SelectorRegistrySaveRequest,
  type SelectorRegistrySyncRequest,
} from '@/shared/contracts/integrations/selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  selectorRegistryDeleteRequestSchema,
  selectorRegistryProfileActionRequestSchema,
  selectorRegistrySaveRequestSchema,
  selectorRegistrySyncRequestSchema,
};

const readListRequest = (request: NextRequest): SelectorRegistryListRequest => {
  const namespaceParam = request.nextUrl.searchParams.get('namespace');
  const namespace = selectorRegistryNamespaceSchema.safeParse(namespaceParam).success
    ? selectorRegistryNamespaceSchema.parse(namespaceParam)
    : null;
  const profile = request.nextUrl.searchParams.get('profile');
  const effectiveParam = request.nextUrl.searchParams.get('effective');
  const includeArchivedParam = request.nextUrl.searchParams.get('includeArchived');

  return {
    namespace,
    profile,
    effective: effectiveParam === null ? undefined : effectiveParam !== 'false',
    includeArchived: includeArchivedParam === null ? undefined : includeArchivedParam === 'true',
  };
};

export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const response = await listSelectorRegistry(readListRequest(request));
  return NextResponse.json(response);
}

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistrySyncRequest;
  const response = await syncSelectorRegistryFromCode(body);
  return NextResponse.json(response);
}

export async function putHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistrySaveRequest;
  const response = await saveSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function deleteHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryDeleteRequest;
  const response = await deleteSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function patchHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProfileActionRequest;
  const response = await mutateSelectorRegistryProfile(body);
  return NextResponse.json(response);
}
