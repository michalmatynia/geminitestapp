import fs from 'node:fs';
import { evaluateAiPathsValidationPreflight, normalizeAiPathsValidationConfig } from '@/features/ai/ai-paths/lib/core/validation-engine';

const cfg = JSON.parse(fs.readFileSync('tmp/codex-check/path_65mv2p_config.json', 'utf8'));
const report = evaluateAiPathsValidationPreflight({
  nodes: cfg.nodes,
  edges: cfg.edges,
  config: normalizeAiPathsValidationConfig({ ...(cfg.aiPathsValidation ?? {}), enabled: true }),
});
const errors = report.findings.filter((f) => f.severity === 'error');
console.log(JSON.stringify({
  score: report.score,
  blocked: report.blocked,
  errors: errors.map((f) => ({
    ruleId: f.ruleId,
    ruleTitle: f.ruleTitle,
    nodeId: f.nodeId,
    message: f.message,
    recommendation: f.recommendation,
  })),
}, null, 2));
