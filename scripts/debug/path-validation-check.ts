import 'dotenv/config';

import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine/defaults';
import { evaluateAiPathsValidationPreflight } from '@/shared/lib/ai-paths/core/validation-engine/evaluator';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const settings = await listAiPathsSettings();
  const rec = settings.find((x) => x.key === `ai_paths_config_${pathId}`);
  if (!rec) {
    console.log(JSON.stringify({ error: 'path_not_found' }, null, 2));
    return;
  }
  const parsed = JSON.parse(rec.value) as Record<string, unknown>;
  const nodes = normalizeNodes(Array.isArray(parsed['nodes']) ? (parsed['nodes'] as never[]) : []);
  const edges = sanitizeEdges(
    nodes,
    Array.isArray(parsed['edges']) ? (parsed['edges'] as never[]) : []
  );
  const report = evaluateAiPathsValidationPreflight({
    nodes,
    edges,
    config: normalizeAiPathsValidationConfig(
      parsed['aiPathsValidation'] as Record<string, unknown> | undefined
    ),
  });
  console.log(
    JSON.stringify(
      {
        pathId,
        enabled: report.enabled,
        blocked: report.blocked,
        shouldWarn: report.shouldWarn,
        score: report.score,
        policy: report.policy,
        warnThreshold: report.warnThreshold,
        blockThreshold: report.blockThreshold,
        failedRules: report.failedRules,
        findings: report.findings.slice(0, 10),
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
