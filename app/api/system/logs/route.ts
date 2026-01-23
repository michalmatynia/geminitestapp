import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from "@/lib/services/system-log-repository";
import type { SystemLogLevel } from "@/types";

const levelSchema = z.enum(["info", "warn", "error"]);

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  level: levelSchema.optional(),
  source: z.string().trim().optional(),
  query: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createSchema = z.object({
  level: levelSchema.optional(),
  message: z.string().min(1),
  source: z.string().trim().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  stack: z.string().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
});

const clearSchema = z.object({
  before: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const result = await listSystemLogs({
      page: parsed.page ?? undefined,
      pageSize: parsed.pageSize ?? undefined,
      level: (parsed.level as SystemLogLevel | undefined) ?? undefined,
      source: parsed.source ?? undefined,
      query: parsed.query ?? undefined,
      from: parsed.from ? new Date(parsed.from) : null,
      to: parsed.to ? new Date(parsed.to) : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[system-logs][GET] Failed to list logs", { errorId, error });
    return NextResponse.json(
      { error: "Failed to list system logs", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const created = await createSystemLog({
      level: (data.level as SystemLogLevel | undefined) ?? undefined,
      message: data.message,
      source: data.source ?? undefined,
      context: data.context ?? null,
      stack: data.stack ?? null,
      path: data.path ?? null,
      method: data.method ?? null,
      statusCode: data.statusCode ?? null,
      requestId: data.requestId ?? null,
      userId: data.userId ?? null,
    });
    return NextResponse.json({ log: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[system-logs][POST] Failed to create log", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const errorId = randomUUID();
  try {
    const url = new URL(req.url);
    const parsed = clearSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const before = parsed.before ? new Date(parsed.before) : null;
    const result = await clearSystemLogs(before);
    return NextResponse.json({ deleted: result.deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[system-logs][DELETE] Failed to clear logs", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
