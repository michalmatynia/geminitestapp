import path from "path";
import { NextResponse } from "next/server";
import { Client } from "pg";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, internalError } from "@/shared/errors/app-error";

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  assertValidPgBackupName,
  getPgRestoreCommand,
  pgExecFileAsync,
} from "@/features/database/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function POST_handler(req: Request): Promise<Response> {
  let stage = "parse";
  let backupName: string | undefined;
  let previewMode: "backup" | "current" = "backup";
  let previewDbName: string | null = null;
  let safePage = 1;
  let safePageSize = 20;
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (_error) {
      return createErrorResponse(badRequestError("Invalid JSON payload"), {
        request: req,
        source: "databases.preview.POST",
      });
    }
    const parsed = body as {
      backupName?: string;
      mode?: "backup" | "current";
      page?: number;
      pageSize?: number;
    };
    backupName = parsed.backupName;
    previewMode = parsed.mode === "current" ? "current" : "backup";
    const page = parsed.page;
    const pageSize = parsed.pageSize;
    if (previewMode === "backup" && !backupName) {
      return createErrorResponse(
        badRequestError("Backup name is required"),
        { request: req, source: "databases.preview.POST" }
      );
    }

    stage = "validate";
    if (previewMode === "backup") {
      assertValidPgBackupName(backupName ?? "");
      await ensurePgBackupsDir();
    }

    const dbUrl = process.env.DATABASE_URL ?? "";
    if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
      return createErrorResponse(
        badRequestError("Preview is only supported for PostgreSQL backups."),
        { request: req, source: "databases.preview.POST" }
      );
    }

    let output = "";
    if (previewMode === "backup") {
      stage = "pg_restore_list";
      const backupPath = path.join(pgBackupsDir, backupName ?? "");
      let stdout = "";
      let stderr = "";
      try {
        const result = await pgExecFileAsync(getPgRestoreCommand(), [
          "--list",
          backupPath,
        ]);
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return createErrorResponse(
          internalError(`Failed to inspect backup: ${message}`),
          {
            request: req,
            source: "databases.preview.POST",
            extra: { backupName },
          }
        );
      }
      output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
    }
    const tableSet = new Set<string>();
    const groups = new Map<string, Set<string>>();
    const knownTypes = [
      "TABLE DATA",
      "TABLE",
      "SEQUENCE SET",
      "SEQUENCE",
      "VIEW",
      "MATERIALIZED VIEW",
      "INDEX",
      "FUNCTION",
      "TYPE",
      "TRIGGER",
      "CONSTRAINT",
      "SCHEMA",
      "EXTENSION",
    ];
    if (previewMode === "backup") {
      const lines = output.split("\n");
      for (const line of lines) {
        const type = knownTypes.find((candidate: string) =>
          line.includes(` ${candidate} `)
        );
        if (!type) continue;
        const parts = line.split(` ${type} `);
        if (parts.length < 2) continue;
        const rest = parts[1]!.trim().split(/\s+/);
        if (rest.length < 2) continue;
        const [schema, name] = rest;
        if (!name) continue;
        const entry = `${schema}.${name}`;
        if (!groups.has(type)) {
          groups.set(type, new Set());
        }
        groups.get(type)?.add(entry);
        if (type === "TABLE DATA" && schema === "public") {
          tableSet.add(name);
        }
      }
    }

    previewDbName = `stardb_preview_${Date.now()}`;
    const adminUrl = new URL(dbUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const adminClient =
      previewMode === "backup"
        ? new Client({ connectionString: adminUrl.toString() })
        : null;
    let previewClient: Client | null = null;
    let tableStats: { name: string; rowEstimate: number }[] = [];
    safePage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
    safePageSize = Math.min(
      200,
      Math.max(1, Number.isFinite(pageSize) ? Number(pageSize) : 20)
    );
    const offset = (safePage - 1) * safePageSize;

    const tableRows: {
      name: string;
      rows: Record<string, unknown>[];
      totalRows: number;
    }[] = [];
    try {
      stage = "connect";
      const previewUrl = new URL(dbUrl);
      if (previewMode === "backup") {
        await adminClient?.connect();
        await adminClient?.query(`CREATE DATABASE "${previewDbName}"`);
        previewUrl.pathname = `/${previewDbName}`;
      }
      previewUrl.searchParams.delete("schema");

      if (previewMode === "backup") {
        stage = "pg_restore_data";
        const backupPath = path.join(pgBackupsDir, backupName ?? "");
        await pgExecFileAsync(getPgRestoreCommand(), [
          "--no-owner",
          "--no-privileges",
          "--single-transaction",
          "--dbname",
          previewUrl.toString(),
          backupPath,
        ]);
      }

      stage = "query";
      previewClient = new Client({ connectionString: previewUrl.toString() });
      await previewClient.connect();

      const tablesResult = await previewClient.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
      );
      const tables = tablesResult.rows.map((row: { tablename: string }) => row.tablename);
      if (previewMode === "current") {
        tableSet.clear();
        tables.forEach((table: string) => tableSet.add(table));
      }

      if (tables.length > 0) {
        const estimateRows = await previewClient.query<{
          relname: string;
          reltuples: number;
        }>( 
          `SELECT c.relname, c.reltuples::bigint AS reltuples
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relkind = 'r'
             AND c.relname = ANY($1)`,
          [tables]
        );
        const rowMap = new Map(
          estimateRows.rows.map((row: { relname: string; reltuples: number }) => [row.relname, Number(row.reltuples)])
        );
        tableStats = tables.map((name: string) => ({
          name,
          rowEstimate: rowMap.get(name) ?? 0,
        }));
      }

      for (const table of tables) {
        const countResult = await previewClient.query<{ total: string }>( 
          `SELECT COUNT(*)::bigint AS total FROM "${table}"`
        );
        const totalRows = Number(countResult.rows[0]?.total ?? 0);

        const rowsResult = await previewClient.query(
          `SELECT * FROM "${table}" LIMIT $1 OFFSET $2`,
          [safePageSize, offset]
        );

        tableRows.push({
          name: table,
          rows: rowsResult.rows as Record<string, unknown>[],
          totalRows,
        });
      }
    } finally {
      await previewClient?.end();
      if (previewMode === "backup" && previewDbName && adminClient) {
        try {
          await adminClient.query(
            `DROP DATABASE IF EXISTS "${previewDbName}" WITH (FORCE)`
          );
        } catch (e) {
          console.error("Failed to drop preview database", e);
        }
        await adminClient.end();
      }
    }

    const groupObj: Record<string, string[]> = {};
    for (const [key, val] of Array.from(groups.entries())) {
      groupObj[key] = Array.from(val);
    }

    return NextResponse.json({
      stats: {
        tables: tableStats,
        groups: groupObj,
      },
      data: tableRows,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "databases.preview.POST",
      fallbackMessage:
        error instanceof Error ? error.message : "Internal Server Error",
      extra: { stage },
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "databases.preview.POST" });
