import { z } from 'zod';

import type { JsonParseResult, ParseJsonOptions } from '@/shared/contracts/ui';
import { badRequestError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const jsonObjectSchema = z.object({}).catchall(z.unknown());

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options?: ParseJsonOptions
): Promise<JsonParseResult<T>> {
  const logPrefix = options?.logPrefix ?? 'request';
  let body: unknown;

  try {
    body = await req.json();
  } catch (error) {
    logClientError(error);
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

export async function parseObjectJsonBody<T extends Record<string, unknown> = Record<string, unknown>>(
  req: Request,
  options?: ParseJsonOptions
): Promise<JsonParseResult<T>> {
  const result = await parseJsonBody(req, jsonObjectSchema, options);
  if (!result.ok) {
    return result as JsonParseResult<T>;
  }

  return {
    ok: true,
    data: result.data as T,
  };
}
