import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';

import { getHandler } from '@/shared/server/api/settings/handler';

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const getHeavyHandler = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  await assertSettingsManageAccess();
  return getHandler(req, ctx, 'heavy');
};
