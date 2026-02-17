import { NextRequest, NextResponse } from 'next/server';

import { getDatabaseEngineProviderPreview } from '@/features/database/services/database-engine-provider-preview';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const parseCollectionsParam = (raw: string | null): string[] | undefined => {
  if (!raw) return undefined;
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const collections = parseCollectionsParam(searchParams.get('collections'));
  const payload = await getDatabaseEngineProviderPreview(
    collections ? { collections } : {}
  );
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
