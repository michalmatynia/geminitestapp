import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { compileGraph } from '@/features/ai/ai-paths/lib/core/utils/graph';
import { evaluateAiPathsValidationPreflight, normalizeAiPathsValidationConfig } from '@/features/ai/ai-paths/lib/core/validation-engine';

const loadEnv = (filePath: string): void => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    if (!key) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnv(path.resolve('.env'));

const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('MONGODB_URI missing');
const dbName = process.env['MONGODB_DB'] || 'app';
const pathId = process.argv[2] || 'path_65mv2p';

async function main(): Promise<void> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  try {
    const db = client.db(dbName);
    const key = `ai_paths_config_${pathId}`;
    const doc = await db.collection('ai_paths_settings').findOne({ key });
    if (!doc?.['value'] || typeof doc['value'] !== 'string') {
      console.log('Path not found', key);
      return;
    }
    const cfg = JSON.parse(doc['value']) as Record<string, unknown>;
    const nodes = Array.isArray(cfg['nodes']) ? (cfg['nodes'] as any[]) : [];
    const edges = Array.isArray(cfg['edges']) ? (cfg['edges'] as any[]) : [];

    const compile = compileGraph(nodes as any, edges as any);
    const validation = evaluateAiPathsValidationPreflight({
      nodes: nodes as any,
      edges: edges as any,
      config: normalizeAiPathsValidationConfig(cfg['aiPathsValidation'] as any),
    });

    console.log(JSON.stringify({
      path: {
        id: cfg['id'],
        name: cfg['name'],
        executionMode: cfg['executionMode'],
        nodes: nodes.length,
        edges: edges.length,
      },
      compile: {
        ok: compile.ok,
        errors: compile.errors,
        warnings: compile.warnings,
        findings: compile.findings,
      },
      validation: {
        enabled: validation.enabled,
        policy: validation.policy,
        score: validation.score,
        blocked: validation.blocked,
        shouldWarn: validation.shouldWarn,
        failedRules: validation.failedRules,
        warnThreshold: validation.warnThreshold,
        blockThreshold: validation.blockThreshold,
        severityCounts: validation.severityCounts,
        findings: validation.findings,
      },
      diagnostics: {
        modelNodes: nodes
          .filter((node) => node && typeof node === 'object' && (node as Record<string, unknown>)['type'] === 'model')
          .map((node) => ({
            id: (node as Record<string, unknown>)['id'],
            title: (node as Record<string, unknown>)['title'],
            waitForResult: ((node as Record<string, any>)['config']?.['model']?.['waitForResult']) ?? null,
          })),
        pollNodes: nodes
          .filter((node) => node && typeof node === 'object' && (node as Record<string, unknown>)['type'] === 'poll')
          .map((node) => ({
            id: (node as Record<string, unknown>)['id'],
            title: (node as Record<string, unknown>)['title'],
          })),
      },
    }, null, 2));
  } finally {
    await client.close();
  }
}

void main();
