import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository } from '@/features/viewer3d/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { logger } from '@/shared/utils/logger';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  try {
    const repository = getAsset3DRepository();
    const categories = await repository.getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' ||
        error.code === 'P2022' ||
        error.code === 'P1001' ||
        error.code === 'P1003')
    ) {
      logger.warn(
        '[assets3d] Falling back to empty categories due to missing table or database.',
        { code: error.code },
      );
      return NextResponse.json([]);
    }
    throw error;
  }
}
