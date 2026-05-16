import { NextResponse, type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { completeGoogleMailOAuthCallback } from '@/features/filemaker/server/mail/mail-google-oauth';

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
  error instanceof Error ? error.message : 'Google OAuth callback failed.';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    await requireFilemakerMailAdminSession();
    const result = await completeGoogleMailOAuthCallback(req);
    return NextResponse.redirect(
      buildAdminMailRedirect(req, {
        accountId: result.accountId,
        panel: 'settings',
        googleAuth: 'connected',
      })
    );
  } catch (error) {
    return NextResponse.redirect(
      buildAdminMailRedirect(req, {
        panel: 'settings',
        googleAuth: 'error',
        message: toErrorMessage(error),
      })
    );
  }
}
