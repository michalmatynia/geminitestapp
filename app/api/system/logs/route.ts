import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from "@/lib/services/system-log-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
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
    return createErrorResponse(error, {
      request: req,
      source: "systemLogs.GET",
      fallbackMessage: "Failed to list system logs",
    });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, createSchema, {
      logPrefix: "systemLogs.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
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
    return createErrorResponse(error, {
      request: req,
      source: "systemLogs.POST",
      fallbackMessage: "Failed to create system log",
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = clearSchema.parse(Object.fromEntries(url.searchParams.entries()));
    const before = parsed.before ? new Date(parsed.before) : null;
    const result = await clearSystemLogs(before);
    return NextResponse.json({ deleted: result.deleted });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "systemLogs.DELETE",
      fallbackMessage: "Failed to clear system logs",
    });
  }
}
