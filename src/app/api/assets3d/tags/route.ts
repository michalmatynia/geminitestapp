export const runtime = 'nodejs';

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAsset3DRepository } from '@/features/viewer3d/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const repository = getAsset3DRepository();
    const tags = await repository.getTags();
    return NextResponse.json(tags);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022' || error.code === 'P1001' || error.code === 'P1003')
    ) {
      console.warn('[assets3d] Falling back to empty tags due to missing table or database.', error.code);
      return NextResponse.json([]);
    }
    throw error;
  }
}

export const GET = apiHandler(GET_handler, { source: 'assets3d/tags.GET' });
