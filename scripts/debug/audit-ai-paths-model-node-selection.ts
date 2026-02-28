import 'dotenv/config';

import { createRequire } from 'module';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_SETTINGS_COLLECTION,
  type MongoAiPathsSettingDoc,
} from '@/features/ai/ai-paths/server/settings-store.constants';

type PathConfigLike = Record<string, unknown> & {
  nodes?: unknown;
};

type AuditRow = {
  key: string;
  pathId: string;
  nodeId: string;
  nodeTitle: string;
  classification: 'explicit_node_model' | 'inherits_brain_default';
  modelId?: string;
};

type MongoClientLike = {
  connect(): Promise<MongoClientLike>;
  close(): Promise<void>;
  db(name: string): {
    collection<T>(name: string): {
      find(
        filter: Record<string, unknown>,
        options?: Record<string, unknown>
      ): { toArray(): Promise<T[]> };
    };
  };
};

type MongoClientCtor = new (
  uri: string,
  options?: Record<string, unknown>
) => MongoClientLike;

const getMongoClientCtor = (): { MongoClient: MongoClientCtor } => {
  const requireFn = createRequire(import.meta.url);
  const pkgName = 'mon' + 'godb';
  return requireFn(pkgName) as { MongoClient: MongoClientCtor };
};

const getMongoDb = async (): Promise<{
  client: MongoClientLike;
  db: ReturnType<MongoClientLike['db']>;
}> => {
  const uri = process.env['MONGODB_URI']?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not set.');
  }
  const dbName = process.env['MONGODB_DB']?.trim() || 'app';
  const { MongoClient } = getMongoClientCtor();
  const client = await new MongoClient(uri).connect();
  return {
    client,
    db: client.db(dbName),
  };
};

const auditPathConfig = (key: string, raw: string): { rows: AuditRow[]; parseError: string | null } => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        rows: [],
        parseError: 'Path config is not a JSON object.',
      };
    }

    const config = parsed as PathConfigLike;
    if (!Array.isArray(config.nodes)) {
      return {
        rows: [],
        parseError: null,
      };
    }

    const pathId = key.startsWith(AI_PATHS_CONFIG_KEY_PREFIX)
      ? key.slice(AI_PATHS_CONFIG_KEY_PREFIX.length)
      : key;

    const rows = config.nodes.flatMap((rawNode: unknown): AuditRow[] => {
      if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) return [];
      const node = rawNode as Record<string, unknown>;
      if (node['type'] !== 'model') return [];

      const nodeId = typeof node['id'] === 'string' ? node['id'] : '';
      const nodeTitle = typeof node['title'] === 'string' ? node['title'] : '';
      const modelConfig =
        node['config'] && typeof node['config'] === 'object' && !Array.isArray(node['config'])
          ? ((node['config'] as Record<string, unknown>)['model'] as Record<string, unknown> | undefined)
          : undefined;
      const selectedModelId =
        modelConfig && typeof modelConfig['modelId'] === 'string' ? modelConfig['modelId'].trim() : '';

      return [
        {
          key,
          pathId,
          nodeId,
          nodeTitle,
          classification: selectedModelId ? 'explicit_node_model' : 'inherits_brain_default',
          ...(selectedModelId ? { modelId: selectedModelId } : {}),
        },
      ];
    });

    return {
      rows,
      parseError: null,
    };
  } catch (error) {
    return {
      rows: [],
      parseError: error instanceof Error ? error.message : 'Unknown JSON parse error.',
    };
  }
};

async function main(): Promise<void> {
  const { client, db } = await getMongoDb();

  try {
    const collection = db.collection<MongoAiPathsSettingDoc>(AI_PATHS_SETTINGS_COLLECTION);
    const docs = await collection
      .find(
        {
          key: {
            $regex: `^${AI_PATHS_CONFIG_KEY_PREFIX}`,
          },
        },
        { projection: { key: 1, value: 1 } }
      )
      .toArray();

    const rows: AuditRow[] = [];
    const parseErrors: Array<{ key: string; error: string }> = [];

    docs.forEach((doc) => {
      const key = typeof doc.key === 'string' ? doc.key : '';
      const value = typeof doc.value === 'string' ? doc.value : '';
      if (!key || !value) return;

      const result = auditPathConfig(key, value);
      rows.push(...result.rows);
      if (result.parseError) {
        parseErrors.push({ key, error: result.parseError });
      }
    });

    const explicitNodeModels = rows.filter(
      (row: AuditRow): boolean => row.classification === 'explicit_node_model'
    ).length;
    const inheritedModels = rows.filter(
      (row: AuditRow): boolean => row.classification === 'inherits_brain_default'
    ).length;

    console.log(
      JSON.stringify(
        {
          mode: 'audit',
          scannedConfigs: docs.length,
          scannedModelNodes: rows.length,
          counts: {
            explicit_node_model: explicitNodeModels,
            inherits_brain_default: inheritedModels,
          },
          rows,
          parseErrors,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error('Failed to audit AI Paths model-node selections:', error);
  process.exit(1);
});
