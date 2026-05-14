import { type NextRequest, NextResponse } from 'next/server';

import {
  ecommerceProviderSettingsSaveRequestSchema,
  type EcommerceProviderSettingsSaveRequest,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';
import {
  getEcommerceProviderSettings,
  saveEcommerceProviderSettings,
} from '@/features/integrations/services/ecommerce-provider-settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, forbiddenError } from '@/shared/errors/app-error';
import { getSessionUser, type SessionUser } from '@/shared/lib/api/session-registry';

const hasProviderSettingsPermission = (sessionUser: SessionUser): boolean =>
  sessionUser?.isElevated === true ||
  (sessionUser?.permissions ?? []).includes('settings.manage');

const assertCanManageProviderSettings = async (ctx: ApiHandlerContext): Promise<void> => {
  const userId = ctx.userId?.trim() ?? '';
  if (userId.length === 0) {
    throw authError('Unauthorized.');
  }
  const sessionUser = await getSessionUser();
  if (hasProviderSettingsPermission(sessionUser)) {
    return;
  }
  throw forbiddenError('Provider settings require an elevated admin session.');
};

export async function getHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  await assertCanManageProviderSettings(ctx);
  return NextResponse.json(
    { ok: true, ...(await getEcommerceProviderSettings()) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function putHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<NextResponse> {
  await assertCanManageProviderSettings(ctx);
  const payload = ctx.body as EcommerceProviderSettingsSaveRequest;
  const result = await saveEcommerceProviderSettings(payload.settings, {
    pushToEcommerce: payload.pushToEcommerce,
    userId: ctx.userId,
  });
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export { ecommerceProviderSettingsSaveRequestSchema };
