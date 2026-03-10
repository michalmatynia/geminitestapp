import { NextRequest } from 'next/server';

import { badRequestError } from '@/shared/errors/app-error';

export const readKangurAuthJsonBody = async (
  request: NextRequest,
  label: string,
  parsedBody?: unknown
): Promise<unknown> => {
  if (parsedBody !== undefined) {
    return parsedBody;
  }

  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError(`Kangur ${label} payload is required.`);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};
