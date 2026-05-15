export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';

import {
  getMilkbarDesignersCmsSnapshot,
  patchMilkbarInquiryStatus,
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
    const body: unknown = await request.json();
    return NextResponse.json(await saveMilkbarDesignersCmsSnapshot(body));
  },
  {
    source: 'v2.page-manager.milkbardesigners.PUT',
    requireAuth: true,
  }
);

export const PATCH = apiHandler(
  async (request: NextRequest) => {
    const body = (await request.json()) as { email?: string; status?: string };
    const result = await patchMilkbarInquiryStatus(
      typeof body.email === 'string' ? body.email : '',
      body.status === 'contacted' ? 'contacted' : 'pending'
    );
    return NextResponse.json(result);
  },
  {
    source: 'v2.page-manager.milkbardesigners.PATCH',
    requireAuth: true,
  }
);
