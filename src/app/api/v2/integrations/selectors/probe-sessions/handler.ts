import { NextResponse, type NextRequest } from 'next/server';

import {
  archiveSelectorRegistryProbeSession,
  deleteSelectorRegistryProbeSession,
  saveSelectorRegistryProbeSession,
} from '@/features/integrations/services/selector-registry-probe-sessions';
import type {
  SelectorRegistryProbeSessionArchiveRequest,
  SelectorRegistryProbeSessionDeleteRequest,
  SelectorRegistryProbeSessionSaveRequest,
} from '@/shared/contracts/integrations/selector-registry';
import {
  selectorRegistryProbeSessionArchiveRequestSchema,
  selectorRegistryProbeSessionDeleteRequestSchema,
  selectorRegistryProbeSessionSaveRequestSchema,
} from '@/shared/contracts/integrations/selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  selectorRegistryProbeSessionArchiveRequestSchema,
  selectorRegistryProbeSessionDeleteRequestSchema,
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
