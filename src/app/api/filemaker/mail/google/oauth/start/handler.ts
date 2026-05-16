import { NextResponse, type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { createGoogleMailOAuthAuthorizationUrl } from '@/features/filemaker/server/mail/mail-google-oauth';

const buildAdminMailRedirect = (
  request: NextRequest,
  params: Record<string, string>
): string => {
  const url = new URL('/admin/filemaker/mail-client', request.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim().length > 0) url.searchParams.set(key, value);
  });
  return url.toString();
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Google OAuth authorization failed.';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = req.nextUrl.searchParams.get('accountId')?.trim() ?? '';
  if (accountId.length === 0) {
    throw validationError('Mail account id is required.');
  }
  try {
    const authorizationUrl = await createGoogleMailOAuthAuthorizationUrl(accountId, req);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    return NextResponse.redirect(
      buildAdminMailRedirect(req, {
        accountId,
        panel: 'settings',
        googleAuth: 'error',
        message: toErrorMessage(error),
      })
    );
  }
}
