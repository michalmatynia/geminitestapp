import 'dotenv/config';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const settings = await listAiPathsSettings();
  const rec = settings.find((item) => item.key === `ai_paths_config_${pathId}`);
  if (!rec) {
    console.log(JSON.stringify({ error: 'path_not_found', pathId }, null, 2));
    return;
  }
  const parsed = JSON.parse(rec.value) as Record<string, unknown>;
  const nodes = Array.isArray(parsed['nodes'])
    ? (parsed['nodes'] as Array<Record<string, unknown>>)
    : [];

  const details = nodes
    .filter((node) => {
      const type = typeof node.type === 'string' ? node.type : '';
      return ['prompt', 'model', 'database', 'trigger', 'simulation'].includes(type);
    })
    .map((node) => {
      const config =
        node.config && typeof node.config === 'object'
          ? (node.config as Record<string, unknown>)
          : {};
      const runtime =
        config.runtime && typeof config.runtime === 'object'
          ? (config.runtime as Record<string, unknown>)
          : {};
      return {
        id: node.id,
        title: node.title,
        type: node.type,
        inputs: Array.isArray(node.inputs) ? node.inputs : [],
        waitForInputs: runtime.waitForInputs ?? false,
        nodeInputContracts:
          node.inputContracts && typeof node.inputContracts === 'object'
            ? node.inputContracts
            : null,
        runtimeInputContracts:
          runtime.inputContracts && typeof runtime.inputContracts === 'object'
            ? runtime.inputContracts
            : null,
      };
    });

  console.log(JSON.stringify({ pathId, name: parsed['name'] ?? null, details }, null, 2));
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
