import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { assertSettingsManageAccess } from '@/shared/lib/auth/settings-manage-access';

import { GET_handler } from '../handler';

export const disableSettingsRateLimit = process.env['NODE_ENV'] !== 'production';

export const GET_heavy_handler = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> => {
  await assertSettingsManageAccess();
  return GET_handler(req, ctx, 'heavy');
};
