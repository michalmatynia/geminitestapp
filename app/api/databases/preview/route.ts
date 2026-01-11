import path from "path";
import { NextResponse } from "next/server";
import { Client } from "pg";

import {
  backupsDir,
  ensureBackupsDir,
  assertValidBackupName,
  getPgRestoreCommand,
  execFileAsync,
} from "../_utils";

export async function POST(req: Request) {
  try {
    const { backupName, mode, page, pageSize } = (await req.json()) as {
      backupName?: string;
      mode?: "backup" | "current";
      page?: number;
      pageSize?: number;
    };
    const previewMode = mode === "current" ? "current" : "backup";
    if (previewMode === "backup" && !backupName) {
      return NextResponse.json(
        { error: "Backup name is required" },
        { status: 400 }
      );
    }

    if (previewMode === "backup") {
      assertValidBackupName(backupName ?? "");
      await ensureBackupsDir();
    }

    const dbUrl = process.env.DATABASE_URL ?? "";
    if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
      return NextResponse.json(
        { error: "Preview is only supported for PostgreSQL backups." },
        { status: 400 }
      );
    }

    let output = "";
    if (previewMode === "backup") {
      const backupPath = path.join(backupsDir, backupName ?? "");
      const { stdout, stderr } = await execFileAsync(getPgRestoreCommand(), [
        "--list",
        backupPath,
      ]);
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
        const type = knownTypes.find((candidate) =>
          line.includes(` ${candidate} `)
        );
        if (!type) continue;
        const parts = line.split(` ${type} `);
        if (parts.length < 2) continue;
        const rest = parts[1].trim().split(/\s+/);
        if (rest.length < 2) continue;
        const [schema, name] = rest;
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
    const tableNames = Array.from(tableSet);

    const previewDbName = `stardb_preview_${Date.now()}`;
    const adminUrl = new URL(dbUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const adminClient =
      previewMode === "backup"
        ? new Client({ connectionString: adminUrl.toString() })
        : null;
    let previewClient: Client | null = null;
    let tableStats: { name: string; rowEstimate: number }[] = [];
    const safePage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
    const safePageSize = Math.min(
      200,
      Math.max(1, Number.isFinite(pageSize) ? Number(pageSize) : 20)
    );
    const offset = (safePage - 1) * safePageSize;

    let tableRows: {
      name: string;
      rows: Record<string, unknown>[];
      totalRows: number;
    }[] = [];
    try {
      const previewUrl = new URL(dbUrl);
      if (previewMode === "backup") {
        await adminClient?.connect();
        await adminClient?.query(`CREATE DATABASE "${previewDbName}"`);
        previewUrl.pathname = `/${previewDbName}`;
      }
      previewUrl.searchParams.delete("schema");

      if (previewMode === "backup") {
        const backupPath = path.join(backupsDir, backupName ?? "");
        await execFileAsync(getPgRestoreCommand(), [
          "--no-owner",
          "--no-privileges",
          "--single-transaction",
          "--dbname",
          previewUrl.toString(),
          backupPath,
        ]);
      }

      previewClient = new Client({ connectionString: previewUrl.toString() });
      await previewClient.connect();

      const tablesResult = await previewClient.query<{
        tablename: string;
      }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
      );
      const tables = tablesResult.rows.map((row) => row.tablename);
      if (previewMode === "current") {
        tableSet.clear();
        tables.forEach((table) => tableSet.add(table));
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
          estimateRows.rows.map((row) => [row.relname, Number(row.reltuples)])
        );
        tableStats = tables.map((name) => ({
          name,
          rowEstimate: rowMap.get(name) ?? 0,
        }));
      }

      for (const table of tables) {
        const countResult = await previewClient.query(
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

      if (previewMode === "current") {
        const addGroup = (type: string, entries: string[]) => {
          if (!groups.has(type)) {
            groups.set(type, new Set());
          }
          const set = groups.get(type);
          entries.forEach((entry) => set?.add(entry));
        };

        const tableEntries = tables.map((table) => `public.${table}`);
        addGroup("TABLE", tableEntries);
        addGroup("TABLE DATA", tableEntries);

        const viewsResult = await previewClient.query<{
          viewname: string;
        }>("SELECT viewname FROM pg_views WHERE schemaname = 'public'");
        addGroup(
          "VIEW",
          viewsResult.rows.map((row) => `public.${row.viewname}`)
        );

        const matViewsResult = await previewClient.query<{
          matviewname: string;
        }>("SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'");
        addGroup(
          "MATERIALIZED VIEW",
          matViewsResult.rows.map((row) => `public.${row.matviewname}`)
        );

        const sequencesResult = await previewClient.query<{
          sequencename: string;
        }>(
          "SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'"
        );
        addGroup(
          "SEQUENCE",
          sequencesResult.rows.map((row) => `public.${row.sequencename}`)
        );

        const functionsResult = await previewClient.query<{
          proname: string;
        }>(
          "SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'"
        );
        addGroup(
          "FUNCTION",
          functionsResult.rows.map((row) => `public.${row.proname}`)
        );

        const typesResult = await previewClient.query<{
          typname: string;
        }>(
          "SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public'"
        );
        addGroup(
          "TYPE",
          typesResult.rows.map((row) => `public.${row.typname}`)
        );

        const indexResult = await previewClient.query<{
          indexname: string;
        }>(
          "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
        );
        addGroup(
          "INDEX",
          indexResult.rows.map((row) => `public.${row.indexname}`)
        );

        const triggerResult = await previewClient.query<{
          tgname: string;
          relname: string;
        }>(
          "SELECT t.tgname, c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal"
        );
        addGroup(
          "TRIGGER",
          triggerResult.rows.map(
            (row) => `public.${row.relname}.${row.tgname}`
          )
        );

        const constraintsResult = await previewClient.query<{
          conname: string;
          relname: string;
        }>(
          "SELECT con.conname, c.relname FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'"
        );
        addGroup(
          "CONSTRAINT",
          constraintsResult.rows.map(
            (row) => `public.${row.relname}.${row.conname}`
          )
        );
      }
    } finally {
      if (previewClient) {
        await previewClient.end().catch(() => undefined);
      }
      if (previewMode === "backup") {
        await adminClient
          ?.query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
            [previewDbName]
          )
          .catch(() => undefined);
        await adminClient
          ?.query(`DROP DATABASE IF EXISTS "${previewDbName}"`)
          .catch(() => undefined);
        await adminClient?.end().catch(() => undefined);
      }
    }

    const groupedObjects = Array.from(groups.entries())
      .map(([type, set]) => ({
        type,
        objects: Array.from(set).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));

    return NextResponse.json({
      content: output || "No preview output.",
      tables: tableStats,
      tableRows,
      groups: groupedObjects,
      page: safePage,
      pageSize: safePageSize,
      mode: previewMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview backup";
    console.error("Failed to preview backup:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
