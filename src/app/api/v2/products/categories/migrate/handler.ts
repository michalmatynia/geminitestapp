import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

const LEGACY_CATEGORY_MIGRATION_REMOVED_MESSAGE =
  'Legacy category migration has been removed. Categories are stored in MongoDB only.';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  throw badRequestError(LEGACY_CATEGORY_MIGRATION_REMOVED_MESSAGE);
}
