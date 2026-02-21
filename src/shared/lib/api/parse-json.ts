import { z } from 'zod';

import type { JsonParseResult, ParseJsonOptions } from '@/shared/contracts/ui';
import { badRequestError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options?: ParseJsonOptions
): Promise<JsonParseResult<T>> {
  const logPrefix = options?.logPrefix ?? 'request';
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    if (options?.allowEmpty) {
      body = {};
    } else {
      return {
        ok: false,
        response: await createErrorResponse(badRequestError('Invalid JSON payload'), {
          request: req,
          source: logPrefix,
        }),
      };
    }
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const error = validationError('Invalid payload', {
      issues: result.error.flatten(),
    });
    return {
      ok: false,
      response: await createErrorResponse(error, { request: req, source: logPrefix }),
    };
  }

  return { ok: true, data: result.data };
}
