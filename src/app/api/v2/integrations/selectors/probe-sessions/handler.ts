import { NextResponse, type NextRequest } from 'next/server';

import {
  archiveSelectorRegistryProbeSession,
  deleteSelectorRegistryProbeSession,
  restoreSelectorRegistryProbeSession,
  saveSelectorRegistryProbeSession,
} from '@/features/integrations/services/selector-registry-probe-sessions';
import type {
  SelectorRegistryProbeSessionArchiveRequest,
  SelectorRegistryProbeSessionDeleteRequest,
  SelectorRegistryProbeSessionRestoreRequest,
  SelectorRegistryProbeSessionSaveRequest,
} from '@/shared/contracts/integrations/selector-registry';
import {
  selectorRegistryProbeSessionArchiveRequestSchema,
  selectorRegistryProbeSessionDeleteRequestSchema,
  selectorRegistryProbeSessionRestoreRequestSchema,
  selectorRegistryProbeSessionSaveRequestSchema,
} from '@/shared/contracts/integrations/selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  selectorRegistryProbeSessionArchiveRequestSchema,
  selectorRegistryProbeSessionDeleteRequestSchema,
  selectorRegistryProbeSessionRestoreRequestSchema,
  selectorRegistryProbeSessionSaveRequestSchema,
};

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProbeSessionSaveRequest;
  const response = await saveSelectorRegistryProbeSession(body);
  return NextResponse.json(response);
}

export async function deleteHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProbeSessionDeleteRequest;
  const response = await deleteSelectorRegistryProbeSession(body);
  return NextResponse.json(response);
}

export async function patchHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProbeSessionArchiveRequest;
  const response = await archiveSelectorRegistryProbeSession(body);
  return NextResponse.json(response);
}

export async function putHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as SelectorRegistryProbeSessionRestoreRequest;
  const response = await restoreSelectorRegistryProbeSession(body);
  return NextResponse.json(response);
}
