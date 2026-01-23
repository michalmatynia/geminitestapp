import { z } from "zod";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, validationError } from "@/lib/errors/app-error";

export type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

type ParseJsonOptions = {
  logPrefix?: string;
  allowEmpty?: boolean;
};

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options?: ParseJsonOptions
): Promise<JsonParseResult<T>> {
  const logPrefix = options?.logPrefix ?? "request";
  let body: unknown;

  try {
    body = await req.json();
  } catch (error) {
    if (options?.allowEmpty) {
      body = {};
    } else {
      return {
        ok: false,
        response: createErrorResponse(badRequestError("Invalid JSON payload"), {
          request: req,
          source: logPrefix,
        }),
      };
    }
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const error = validationError("Invalid payload", {
      issues: result.error.flatten(),
    });
    return {
      ok: false,
      response: createErrorResponse(error, { request: req, source: logPrefix }),
    };
  }

  return { ok: true, data: result.data };
}
