export const runtime = 'nodejs';

import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  assertValidPgBackupName,
  getPgRestoreCommand,
  pgExecFileAsync,
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  mongoExecFileAsync,
} from '@/features/database/server';
import { ErrorSystem } from '@/features/observability/server';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import type { ApiHandlerContext } from '@/shared/types/api';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let backupName: string | undefined;
  let previewMode: 'backup' | 'current' = 'backup';
  let previewDbName: string | null = null;
  let safePage = 1;
  let safePageSize = 20;
  const dbUrl = process.env['DATABASE_URL'] ?? '';

  const body = (await req.json()) as {
    backupName?: string;
    mode?: 'backup' | 'current';
    type?: 'postgresql' | 'mongodb';
    page?: number;
    pageSize?: number;
  };
  backupName = body.backupName;
  previewMode = body.mode === 'current' ? 'current' : 'backup';
  const previewType = body.type === 'mongodb' ? 'mongodb' : 'postgresql';
  const page = body.page;
  const pageSize = body.pageSize;

  if (previewMode === 'backup' && !backupName) {
    throw badRequestError('Backup name is required');
  }

  if (previewType === 'mongodb') {
    if (previewMode === 'backup') {
      assertValidMongoBackupName(backupName ?? '');
      await ensureMongoBackupsDir();
    }
  } else {
    if (previewMode === 'backup') {
      assertValidPgBackupName(backupName ?? '');
      await ensurePgBackupsDir();
    }
      
    if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
      throw badRequestError('Preview is only supported for PostgreSQL backups.');
    }
  }

  if (previewType === 'mongodb') {
    const mongoUri = getMongoConnectionUrl();
    const sourceDbName = getMongoDatabaseName();
    const previewDb = previewMode === 'backup' ? `stardb_preview_${Date.now()}` : sourceDbName;
    safePage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
    safePageSize = Math.min(
      200,
      Math.max(1, Number.isFinite(pageSize) ? Number(pageSize) : 20)
    );
    const offset = (safePage - 1) * safePageSize;

    if (previewMode === 'backup') {
      const backupPath = path.join(mongoBackupsDir, backupName ?? '');
      await mongoExecFileAsync(getMongoRestoreCommand(), [
        '--uri',
        mongoUri,
        '--archive=' + backupPath,
        '--gzip',
        '--nsFrom',
        `${sourceDbName}.*`,
        '--nsTo',
        `${previewDb}.*`,
        '--drop',
      ]);
    }

    const mongoClient = await getMongoClient();
    const db = mongoClient.db(previewDb);
    let collections: string[] = [];
    let tableRows: { name: string; rows: Record<string, unknown>[]; totalRows: number }[] = [];
    let tableStats: { name: string; rowEstimate: number }[] = [];

    try {
      const collectionInfos = await db.listCollections().toArray();
      collections = collectionInfos.map((info: { name: string }) => info.name);

      const rowsResults = await Promise.all(
        collections.map(async (collectionName: string) => {
          const collection = db.collection(collectionName);
          const totalRows = await collection.countDocuments();
          const rows = await collection
            .find({})
            .skip(offset)
            .limit(safePageSize)
            .toArray();
          return { name: collectionName, rows: rows as Record<string, unknown>[], totalRows };
        })
      );
      tableRows = rowsResults;

      tableStats = await Promise.all(
        collections.map(async (collectionName: string) => {
          const collection = db.collection(collectionName);
          const estimate = await collection.estimatedDocumentCount();
          return { name: collectionName, rowEstimate: estimate };
        })
      );
    } finally {
      if (previewMode === 'backup') {
        await db.dropDatabase();
      }
    }

    return NextResponse.json({
      stats: {
        tables: tableStats,
        groups: collections.length ? { COLLECTION: collections } : {},
      },
      data: tableRows,
      page: safePage,
      pageSize: safePageSize,
    });
  }

  let output = '';
  if (previewMode === 'backup') {
    const backupPath = path.join(pgBackupsDir, backupName ?? '');
    let stdout = '';
    let stderr = '';
    try {
      const result = await pgExecFileAsync(getPgRestoreCommand(), [
        '--list',
        backupPath,
      ]);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`Failed to inspect backup: ${message}`);
    }
    output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  }
  const tableSet = new Set<string>();
  const groups = new Map<string, Set<string>>();
  const knownTypes = [
    'TABLE DATA',
    'TABLE',
    'SEQUENCE SET',
    'SEQUENCE',
    'VIEW',
    'MATERIALIZED VIEW',
    'INDEX',
    'FUNCTION',
    'TYPE',
    'TRIGGER',
    'CONSTRAINT',
    'SCHEMA',
    'EXTENSION',
  ];
  if (previewMode === 'backup') {
    const lines = output.split('\n');
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
      if (type === 'TABLE DATA' && schema === 'public') {
        tableSet.add(name);
      }
    }
  }

  previewDbName = `stardb_preview_${Date.now()}`;
  const adminUrl = new URL(process.env['DATABASE_URL'] ?? '');
  adminUrl.pathname = '/postgres';
  adminUrl.searchParams.delete('schema');
  const adminClient =
      previewMode === 'backup'
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

    type TableDetailEntry = {
      name: string;
      columns: { name: string; type: string; nullable: boolean; defaultValue: string | null; isPrimaryKey: boolean }[];
      indexes: { name: string; columns: string[]; isUnique: boolean; definition: string }[];
      foreignKeys: { name: string; column: string; referencedTable: string; referencedColumn: string; onDelete: string; onUpdate: string }[];
      rowEstimate: number;
      sizeBytes: number;
      sizeFormatted: string;
    };
    let tableDetails: TableDetailEntry[] = [];
    let enumTypes: { name: string; values: string[] }[] = [];
    let databaseSize = '';

    try {
      const previewUrl = new URL(process.env['DATABASE_URL'] ?? '');
      if (previewMode === 'backup') {
        await adminClient?.connect();
        await adminClient?.query(`CREATE DATABASE "${previewDbName}"`);
        previewUrl.pathname = `/${previewDbName}`;
      }
      previewUrl.searchParams.delete('schema');

      if (previewMode === 'backup') {
        const backupPath = path.join(pgBackupsDir, backupName ?? '');
        await pgExecFileAsync(getPgRestoreCommand(), [
          '--no-owner',
          '--no-privileges',
          '--single-transaction',
          '--dbname',
          previewUrl.toString(),
          backupPath,
        ]);
      }

      previewClient = new Client({ connectionString: previewUrl.toString() });
      await previewClient.connect();

      const tablesResult = await previewClient.query<{ tablename: string }>(
        'SELECT tablename FROM pg_tables WHERE schemaname = \'public\' ORDER BY tablename'
      );
      const tables = tablesResult.rows.map((row: { tablename: string }) => row.tablename);
      if (previewMode === 'current') {
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

      // ── Detailed schema queries ──

      const columnsResult = await previewClient.query<{
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name, ordinal_position`
      );

      const pkResult = await previewClient.query<{
        table_name: string;
        column_name: string;
      }>(
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = 'public'`
      );
      const pkSet = new Set(
        pkResult.rows.map((r: { table_name: string; column_name: string }) => `${r.table_name}.${r.column_name}`)
      );

      const indexResult = await previewClient.query<{
        tablename: string;
        indexname: string;
        indexdef: string;
      }>(
        'SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = \'public\' ORDER BY tablename, indexname'
      );
      const uniqueIndexResult = await previewClient.query<{
        indexname: string;
        indisunique: boolean;
      }>(
        `SELECT i.relname AS indexname, ix.indisunique
         FROM pg_index ix
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_class t ON t.oid = ix.indrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         WHERE n.nspname = 'public'`
      );
      const uniqueMap = new Map(
        uniqueIndexResult.rows.map((r: { indexname: string; indisunique: boolean }) => [r.indexname, r.indisunique])
      );

      const fkResult = await previewClient.query<{
        constraint_name: string;
        source_table: string;
        source_column: string;
        target_table: string;
        target_column: string;
        delete_rule: string;
        update_rule: string;
      }>(
        `SELECT
           tc.constraint_name,
           tc.table_name AS source_table,
           kcu.column_name AS source_column,
           ccu.table_name AS target_table,
           ccu.column_name AS target_column,
           rc.delete_rule,
           rc.update_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
           AND tc.table_schema = rc.constraint_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = 'public'
         ORDER BY tc.table_name, tc.constraint_name`
      );

      const enumResult = await previewClient.query<{
        enum_name: string;
        enum_value: string;
      }>(
        `SELECT t.typname AS enum_name, e.enumlabel AS enum_value
         FROM pg_type t
         JOIN pg_enum e ON t.oid = e.enumtypid
         JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE n.nspname = 'public'
         ORDER BY t.typname, e.enumsortorder`
      );
      const enumMap = new Map<string, string[]>();
      for (const row of enumResult.rows) {
        const existing = enumMap.get(row.enum_name);
        if (existing) {
          existing.push(row.enum_value);
        } else {
          enumMap.set(row.enum_name, [row.enum_value]);
        }
      }
      enumTypes = Array.from(enumMap.entries()).map(([name, values]: [string, string[]]) => ({ name, values }));

      const sizeResult = await previewClient.query<{
        tablename: string;
        size_bytes: string;
        size_formatted: string;
      }>(
        `SELECT
           c.relname AS tablename,
           pg_total_relation_size(c.oid)::bigint AS size_bytes,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS size_formatted
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
         ORDER BY c.relname`
      );
      const sizeMap = new Map(
        sizeResult.rows.map((r: { tablename: string; size_bytes: string; size_formatted: string }) => [
          r.tablename,
          { sizeBytes: Number(r.size_bytes), sizeFormatted: r.size_formatted },
        ])
      );

      const dbSizeResult = await previewClient.query<{ size: string }>(
        'SELECT pg_size_pretty(pg_database_size(current_database())) AS size'
      );
      databaseSize = dbSizeResult.rows[0]?.size ?? '';

      // ── Build tableDetails ──

      const colsByTable = new Map<string, typeof columnsResult.rows>();
      for (const col of columnsResult.rows) {
        const existing = colsByTable.get(col.table_name);
        if (existing) {
          existing.push(col);
        } else {
          colsByTable.set(col.table_name, [col]);
        }
      }
      const idxByTable = new Map<string, typeof indexResult.rows>();
      for (const idx of indexResult.rows) {
        const existing = idxByTable.get(idx.tablename);
        if (existing) {
          existing.push(idx);
        } else {
          idxByTable.set(idx.tablename, [idx]);
        }
      }
      const fkByTable = new Map<string, typeof fkResult.rows>();
      for (const fk of fkResult.rows) {
        const existing = fkByTable.get(fk.source_table);
        if (existing) {
          existing.push(fk);
        } else {
          fkByTable.set(fk.source_table, [fk]);
        }
      }

      const rowEstimateMap = new Map(tableStats.map((t: { name: string; rowEstimate: number }) => [t.name, t.rowEstimate]));

      tableDetails = tables.map((tableName: string) => {
        const cols = colsByTable.get(tableName) ?? [];
        const idxs = idxByTable.get(tableName) ?? [];
        const fks = fkByTable.get(tableName) ?? [];
        const size = sizeMap.get(tableName) ?? { sizeBytes: 0, sizeFormatted: '0 bytes' };

        return {
          name: tableName,
          columns: cols.map((c) => ({
            name: c.column_name,
            type: c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type,
            nullable: c.is_nullable === 'YES',
            defaultValue: c.column_default,
            isPrimaryKey: pkSet.has(`${tableName}.${c.column_name}`),
          })),
          indexes: idxs.map((i) => {
            const colMatch = i.indexdef.match(/\(([^)]+)\)/);
            const columns = colMatch ? colMatch[1]!.split(',').map((s: string) => s.trim()) : [];
            return {
              name: i.indexname,
              columns,
              isUnique: uniqueMap.get(i.indexname) ?? false,
              definition: i.indexdef,
            };
          }),
          foreignKeys: fks.map((f) => ({
            name: f.constraint_name,
            column: f.source_column,
            referencedTable: f.target_table,
            referencedColumn: f.target_column,
            onDelete: f.delete_rule,
            onUpdate: f.update_rule,
          })),
          rowEstimate: rowEstimateMap.get(tableName) ?? 0,
          sizeBytes: size.sizeBytes,
          sizeFormatted: size.sizeFormatted,
        };
      });

      // ── Fetch paginated rows ──

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
      if (previewMode === 'backup' && previewDbName && adminClient) {
        try {
          await adminClient.query(
            `DROP DATABASE IF EXISTS "${previewDbName}" WITH (FORCE)`
          );
        } catch (e) {
          void ErrorSystem.captureException(e, { service: 'api/databases/preview', action: 'drop_preview_db' });
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
      tableDetails,
      enums: enumTypes,
      databaseSize,
    });
}
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.preview.POST' });
