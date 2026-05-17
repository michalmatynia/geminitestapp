/**
 * @file parse-json.ts
 * @description Safe JSON parsing utilities for API request bodies with Zod validation.
 * These utilities ensure that incoming JSON payloads are well-formed and adhere 
 * to expected schemas before being processed by handlers.
 */

import { z } from 'zod';

import type { JsonParseResult, ParseJsonOptions } from '@/shared/contracts/ui/api';
import { badRequestError, validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

/** Default schema for arbitrary JSON objects */
const jsonObjectSchema = z.object({}).catchall(z.unknown());

/**
 * Parses the request body as JSON and validates it against a Zod schema.
 * 
 * @param req The incoming Request object
 * @param schema Zod schema to validate the body against
 * @param options Configuration for parsing and logging
 * @returns A result object containing either the validated data or a pre-formatted error response
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options?: ParseJsonOptions
): Promise<JsonParseResult<T>> {
  const logPrefix = options?.logPrefix ?? 'request';
  let body: unknown;

  // Use text() + JSON.parse() instead of req.json() so that:
  // - An empty body (stream closed during long dev compilation) is treated as
  //   allowEmpty rather than throwing a SyntaxError
  // - Error messages pinpoint the bad text rather than a generic stream error
  let text: string;
  try {
    text = await req.text();
  } catch (error) {
    return {
      ok: false,
      response: await createErrorResponse(badRequestError('Invalid JSON payload').withCause(error), {
        request: req,
        source: logPrefix,
      }),
    };
  }

  if (!text.trim()) {
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
  } else {
    try {
      body = JSON.parse(text) as unknown;
    } catch (error) {
      return {
        ok: false,
        response: await createErrorResponse(badRequestError('Invalid JSON payload').withCause(error), {
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

/**
 * Parses the request body as a generic JSON object without a specific schema.
 * 
 * @param req The incoming Request object
 * @param options Configuration for parsing and logging
 * @returns A result object containing either the parsed object or a pre-formatted error response
 */
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
