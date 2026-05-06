import { NextResponse, type NextRequest } from 'next/server';

import { assertSettingsManageAccess } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  readGoogleOAuthCredentialsStatus,
  updateGoogleOAuthCredentials,
} from '@/shared/lib/oauth/google-oauth-credentials';
import { updateGoogleOAuthCredentialsSchema } from '@/shared/contracts/google-oauth-credentials';

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  return NextResponse.json(await readGoogleOAuthCredentialsStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertSettingsManageAccess();
  const parsed = await parseJsonBody(req, updateGoogleOAuthCredentialsSchema, {
    logPrefix: 'settings.googleOAuth.POST',
  });
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(await updateGoogleOAuthCredentials(parsed.data), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
