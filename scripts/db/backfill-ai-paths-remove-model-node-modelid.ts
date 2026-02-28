import 'dotenv/config';

import { createRequire } from 'module';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_SETTINGS_COLLECTION,
  type MongoAiPathsSettingDoc,
} from '@/features/ai/ai-paths/server/settings-store.constants';

type CliOptions = {
  dryRun: boolean;
};

type StripResult = {
  nextValue: string | null;
  changedNodes: number;
  parseError: string | null;
};

type PathConfigLike = Record<string, unknown> & {
  nodes?: unknown;
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
      updateOne(
        filter: Record<string, unknown>,
        update: Record<string, unknown>
      ): Promise<unknown>;
    };
  };
};

type MongoClientCtor = new (
  uri: string,
  options?: Record<string, unknown>
) => MongoClientLike;

const parseArgs = (argv: string[]): CliOptions => ({
  dryRun: !argv.includes('--write'),
});

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

const stripModelIdFromPathConfig = (raw: string): StripResult => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        nextValue: null,
        changedNodes: 0,
        parseError: 'Path config is not a JSON object.',
      };
    }

    const config = parsed as PathConfigLike;
    if (!Array.isArray(config.nodes)) {
      return {
        nextValue: null,
        changedNodes: 0,
        parseError: null,
      };
    }

    let changedNodes = 0;
    const nextNodes = config.nodes.map((node: unknown): unknown => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
      const pathNode = node as Record<string, unknown>;
      if (pathNode['type'] !== 'model') return node;

      const rawConfig = pathNode['config'];
      if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) return node;

      const nodeConfig = rawConfig as Record<string, unknown>;
      const rawModel = nodeConfig['model'];
      if (!rawModel || typeof rawModel !== 'object' || Array.isArray(rawModel)) return node;

      const modelConfig = rawModel as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(modelConfig, 'modelId')) {
        return node;
      }

      const { modelId: _discardedModelId, ...nextModelConfig } = modelConfig;
      changedNodes += 1;

      return {
        ...pathNode,
        config: {
          ...nodeConfig,
          model: nextModelConfig,
        },
      };
    });

    if (changedNodes === 0) {
      return {
        nextValue: null,
        changedNodes: 0,
        parseError: null,
      };
    }

    return {
      nextValue: JSON.stringify({ ...config, nodes: nextNodes }),
      changedNodes,
      parseError: null,
    };
  } catch (error) {
    return {
      nextValue: null,
      changedNodes: 0,
      parseError: error instanceof Error ? error.message : 'Unknown JSON parse error.',
    };
  }
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
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

    const updates: Array<{ key: string; value: string; changedNodes: number }> = [];
    const parseErrors: Array<{ key: string; error: string }> = [];

    for (const doc of docs) {
      const key = typeof doc.key === 'string' ? doc.key : '';
      const value = typeof doc.value === 'string' ? doc.value : '';
      if (!key || !value) continue;

      const result = stripModelIdFromPathConfig(value);
      if (result.parseError) {
        parseErrors.push({ key, error: result.parseError });
        continue;
      }
      if (!result.nextValue) continue;

      updates.push({
        key,
        value: result.nextValue,
        changedNodes: result.changedNodes,
      });
    }

    if (!options.dryRun && updates.length > 0) {
      const now = new Date();
      await Promise.all(
        updates.map((update) =>
          collection.updateOne(
            { key: update.key },
            {
              $set: {
                key: update.key,
                value: update.value,
                updatedAt: now,
              },
            }
          )
        )
      );
    }

    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'write',
          scannedConfigs: docs.length,
          changedConfigs: updates.length,
          changedNodes: updates.reduce((sum, entry) => sum + entry.changedNodes, 0),
          updates: updates.map((entry) => ({
            key: entry.key,
            changedNodes: entry.changedNodes,
          })),
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
  console.error('Failed to backfill AI Paths model-node modelId removal:', error);
  process.exit(1);
});
