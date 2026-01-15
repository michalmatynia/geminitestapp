import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

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
      const errorId = randomUUID();
      console.error(`[${logPrefix}] Failed to parse JSON body`, {
        errorId,
        error,
      });
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Invalid JSON payload", errorId },
          { status: 400 }
        ),
      };
    }
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errorId = randomUUID();
    console.warn(`[${logPrefix}] Invalid payload`, {
      errorId,
      issues: result.error.flatten(),
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid payload", details: result.error.flatten(), errorId },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}
