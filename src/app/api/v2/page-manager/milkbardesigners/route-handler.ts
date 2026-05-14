export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';

import {
  getMilkbarDesignersCmsSnapshot,
  saveMilkbarDesignersCmsSnapshot,
} from '@/features/page-manager/milkbardesigners/milkbar-cms.server';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(
  async () => NextResponse.json(await getMilkbarDesignersCmsSnapshot()),
  {
    source: 'v2.page-manager.milkbardesigners.GET',
    requireAuth: true,
  }
);

export const PUT = apiHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    return NextResponse.json(await saveMilkbarDesignersCmsSnapshot(body));
  },
  {
    source: 'v2.page-manager.milkbardesigners.PUT',
    requireAuth: true,
  }
);
