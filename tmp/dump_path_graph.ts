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
  const edges = Array.isArray(parsed['edges'])
    ? (parsed['edges'] as Array<Record<string, unknown>>)
    : [];

  const nodeMap = new Map(
    nodes.map((node) => [
      typeof node.id === 'string' ? node.id : '',
      {
        id: node.id,
        title: node.title,
        type: node.type,
      },
    ]),
  );

  const simplifiedEdges = edges.map((edge) => {
    const fromId = typeof edge.from === 'string' ? edge.from : null;
    const toId = typeof edge.to === 'string' ? edge.to : null;
    const fromNode = fromId ? nodeMap.get(fromId) : null;
    const toNode = toId ? nodeMap.get(toId) : null;
    return {
      id: edge.id,
      from: fromId,
      fromTitle: fromNode?.title ?? null,
      fromType: fromNode?.type ?? null,
      fromPort: edge.fromPort ?? null,
      to: toId,
      toTitle: toNode?.title ?? null,
      toType: toNode?.type ?? null,
      toPort: edge.toPort ?? null,
    };
  });

  console.log(
    JSON.stringify(
      {
        pathId,
        name: parsed['name'] ?? null,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes: Array.from(nodeMap.values()),
        edges: simplifiedEdges,
      },
      null,
      2,
    ),
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
