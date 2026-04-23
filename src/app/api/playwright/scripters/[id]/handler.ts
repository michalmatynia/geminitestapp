import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getDefaultScripterRegistry } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const getHandler = async (
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  if (!params.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const registry = getDefaultScripterRegistry();
  const definition = await registry.get(params.id);
  if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(definition);
};

export const deleteHandler = async (
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  if (!params.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const registry = getDefaultScripterRegistry();
  const deleted = await registry.delete(params.id);
  return NextResponse.json({ deleted });
};
