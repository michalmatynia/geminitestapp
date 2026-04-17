import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';

import {
  cloneAmazonSelectorRegistryProfile,
  deleteAmazonSelectorRegistryEntry,
  deleteAmazonSelectorRegistryProfile,
  listAmazonSelectorRegistry,
  renameAmazonSelectorRegistryProfile,
  saveAmazonSelectorRegistryEntry,
  syncAmazonSelectorRegistryFromCode,
} from '@/features/integrations/services/amazon-selector-registry';
import {
  type AmazonSelectorRegistryProfileActionResponse,
  amazonSelectorRegistryDeleteRequestSchema,
  amazonSelectorRegistryProfileActionRequestSchema,
  amazonSelectorRegistrySaveRequestSchema,
  amazonSelectorRegistrySyncRequestSchema,
} from '@/shared/contracts/integrations/amazon-selector-registry';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export {
  amazonSelectorRegistryDeleteRequestSchema,
  amazonSelectorRegistryProfileActionRequestSchema,
  amazonSelectorRegistrySaveRequestSchema,
  amazonSelectorRegistrySyncRequestSchema,
};

export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const response = await listAmazonSelectorRegistry({
    profile: request.nextUrl.searchParams.get('profile'),
  });
  return NextResponse.json(response);
}

export async function postHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = (ctx.body ?? {}) as z.infer<typeof amazonSelectorRegistrySyncRequestSchema>;
  const response = await syncAmazonSelectorRegistryFromCode({ profile: body.profile });
  return NextResponse.json(response);
}

export async function putHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof amazonSelectorRegistrySaveRequestSchema>;
  const response = await saveAmazonSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function deleteHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof amazonSelectorRegistryDeleteRequestSchema>;
  const response = await deleteAmazonSelectorRegistryEntry(body);
  return NextResponse.json(response);
}

export async function patchHandler(
  _request: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof amazonSelectorRegistryProfileActionRequestSchema>;

  let response: AmazonSelectorRegistryProfileActionResponse;
  if (body.action === 'clone_profile') {
    response = await cloneAmazonSelectorRegistryProfile(body);
  } else if (body.action === 'rename_profile') {
    response = await renameAmazonSelectorRegistryProfile(body);
  } else {
    response = await deleteAmazonSelectorRegistryProfile(body);
  }

  return NextResponse.json(response);
}
