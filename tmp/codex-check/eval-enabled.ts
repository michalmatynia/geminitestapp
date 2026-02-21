import fs from 'node:fs';
import { evaluateAiPathsValidationPreflight, normalizeAiPathsValidationConfig } from '@/features/ai/ai-paths/lib/core/validation-engine';

const cfg = JSON.parse(fs.readFileSync('tmp/codex-check/path_65mv2p_config.json', 'utf8'));
const nodes = cfg.nodes;
const edges = cfg.edges;
const config = normalizeAiPathsValidationConfig({ ...(cfg.aiPathsValidation ?? {}), enabled: true });
const report = evaluateAiPathsValidationPreflight({ nodes, edges, config });
console.log(JSON.stringify({
  enabled: report.enabled,
  policy: report.policy,
  score: report.score,
  blocked: report.blocked,
  shouldWarn: report.shouldWarn,
  failedRules: report.failedRules,
  severityCounts: report.severityCounts,
  topFindings: report.findings.slice(0, 12).map((f) => ({
    severity: f.severity,
    ruleTitle: f.ruleTitle,
    ruleId: f.ruleId,
    nodeId: f.nodeId,
    failedConditionIds: f.failedConditionIds,
  })),
}, null, 2));
