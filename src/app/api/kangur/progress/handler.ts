import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurProgressRepository } from '@/features/kangur/server';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { parseKangurProgressUpdatePayload } from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur progress payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

const normalizeUserKeyPart = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveProgressUserKey = async (): Promise<string> => {
  const session = await auth();
  const email = normalizeUserKeyPart(session?.user?.email).toLowerCase();
  if (email) {
    return email;
  }

  const id = normalizeUserKeyPart(session?.user?.id);
  if (id) {
    return id;
  }

  throw authError('Authentication required.');
};

export async function getKangurProgressHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const userKey = await resolveProgressUserKey();
  const repository = await getKangurProgressRepository();
  const progress = await repository.getProgress(userKey);

  return NextResponse.json(progress);
}

export async function patchKangurProgressHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurProgressUpdatePayload(await readBodyJson(req));
  const userKey = await resolveProgressUserKey();
  const repository = await getKangurProgressRepository();
  const progress = await repository.saveProgress(userKey, payload);

  return NextResponse.json(progress);
}
