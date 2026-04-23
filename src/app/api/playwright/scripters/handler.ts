import { NextResponse } from 'next/server';

import {
  getDefaultScripterRegistry,
  loadScripter,
} from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const getHandler = async (
  _req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const registry = getDefaultScripterRegistry();
  const entries = await registry.list();
  return NextResponse.json({ scripters: entries });
};

export const postHandler = async (
  req: Request,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = loadScripter(body);
  if (!parsed.ok) {
    return NextResponse.json({ errors: parsed.errors }, { status: 400 });
  }
  const registry = getDefaultScripterRegistry();
  try {
    const saved = await registry.save(parsed.definition);
    return NextResponse.json(saved, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { errors: [err instanceof Error ? err.message : String(err)] },
      { status: 409 }
    );
  }
};
