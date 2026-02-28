import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import {
  compileGraph,
  inspectPathDependencies,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
} from '@/features/ai/ai-paths/lib';

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i <= 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('MONGODB_URI missing');
const dbName = process.env['MONGODB_DB'] || 'app';

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  try {
    const db = client.db(dbName);
    const key = 'ai_paths_config_path_65mv2p';
    const doc = await db.collection('ai_paths_settings').findOne({ key });
    if (!doc || typeof (doc as any).value !== 'string') {
      console.log('not found');
      return;
    }
    const cfg = JSON.parse((doc as any).value);
    fs.writeFileSync(
      'tmp/codex-check/path_65mv2p_config_live_after.json',
      JSON.stringify(cfg, null, 2)
    );
    const nodes = Array.isArray(cfg.nodes) ? cfg.nodes : [];
    const edges = Array.isArray(cfg.edges) ? cfg.edges : [];

    const compile = compileGraph(nodes, edges);
    const deps = inspectPathDependencies(nodes, edges);
    const validation = evaluateAiPathsValidationPreflight({
      nodes,
      edges,
      config: normalizeAiPathsValidationConfig(cfg.aiPathsValidation),
    });

    console.log(
      JSON.stringify(
        {
          compile: {
            ok: compile.ok,
            errors: compile.errors,
            warnings: compile.warnings,
            findings: compile.findings.slice(0, 10),
          },
          deps: {
            errors: deps.errors,
            warnings: deps.warnings,
            topRisks: deps.risks.slice(0, 12).map((risk) => ({
              id: risk.id,
              severity: risk.severity,
              nodeId: risk.nodeId,
              nodeType: risk.nodeType,
              message: risk.message,
            })),
          },
          validation: {
            enabled: validation.enabled,
            policy: validation.policy,
            blocked: validation.blocked,
            shouldWarn: validation.shouldWarn,
            score: validation.score,
            failedRules: validation.failedRules,
          },
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
}

void main();
