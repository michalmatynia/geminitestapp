import fs from 'node:fs';
import path from 'node:path';

import {
  compileGraph,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
} from '../../src/features/ai/ai-paths/lib';

const files = ['/tmp/path_65mv2p.json', '/tmp/path_infer_params.json'];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ file, error: 'missing file' }));
    continue;
  }
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) {
    console.log(JSON.stringify({ file, error: 'empty file' }));
    continue;
  }
  const cfg = JSON.parse(raw) as Record<string, unknown>;
  const nodes = Array.isArray(cfg.nodes) ? (cfg.nodes as unknown[]) : [];
  const edges = Array.isArray(cfg.edges) ? (cfg.edges as unknown[]) : [];
  const compile = compileGraph(nodes as any, edges as any);
  const validationCfg = normalizeAiPathsValidationConfig(
    (cfg.aiPathsValidation as any) ?? undefined
  );
  const preflight = evaluateAiPathsValidationPreflight({
    nodes: nodes as any,
    edges: edges as any,
    config: validationCfg,
  });
  const findings = preflight.findings.slice(0, 5).map((f) => ({
    id: f.ruleId,
    severity: f.severity,
    failed: f.failed,
    title: f.ruleTitle,
  }));
  console.log(
    JSON.stringify(
      {
        file,
        pathId: cfg.id,
        name: cfg.name,
        compileOk: compile.ok,
        compileErrors: compile.errors,
        compileWarnings: compile.warnings,
        compileFirstError: compile.findings.find((f) => f.severity === 'error')?.message ?? null,
        validationEnabled: preflight.enabled,
        validationPolicy: preflight.policy,
        validationBlocked: preflight.blocked,
        validationScore: preflight.score,
        validationFailedRules: preflight.failedRules,
        findings,
      },
      null,
      2
    )
  );
}
