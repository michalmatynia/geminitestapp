import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';
import {
  buildKangurKnowledgeGraphSyncPayload,
  syncKangurKnowledgeGraphToNeo4j,
} from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

type CliOptions = {
  dryRun: boolean;
  locale: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const dryRun = argv.includes('--dry-run');
  const localeArg = argv.find((arg) => arg.startsWith('--locale='));
  const locale = localeArg?.split('=').slice(1).join('=').trim() || 'pl';
  return { dryRun, locale };
};

const summarizePayload = (payload: ReturnType<typeof buildKangurKnowledgeGraphSyncPayload>) => {
  const nodeCounts = payload.nodes.reduce<Record<string, number>>((acc, node) => {
    const kind = String(node['kind'] ?? 'unknown');
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});

  const edgeCounts = payload.edges.reduce<Record<string, number>>((acc, edge) => {
    const kind = String(edge['kind'] ?? 'unknown');
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    graphKey: payload.graphKey,
    nodeCount: payload.nodes.length,
    edgeCount: payload.edges.length,
    nodeCounts,
    edgeCounts,
  };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const tutorContent = await getKangurAiTutorContent(options.locale).catch(
    () => DEFAULT_KANGUR_AI_TUTOR_CONTENT
  );
  const nativeGuideStore = await getKangurAiTutorNativeGuideStore(options.locale).catch(
    () => DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE
  );
  const snapshot = buildKangurKnowledgeGraph({
    locale: options.locale,
    tutorContent,
    nativeGuideStore,
  });
  const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);

  if (options.dryRun || !isNeo4jEnabled()) {
    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'preview',
          neo4jEnabled: isNeo4jEnabled(),
          summary: summarizePayload(payload),
        },
        null,
        2
      )
    );
    return;
  }

  const result = await syncKangurKnowledgeGraphToNeo4j(snapshot);
  console.log(
    JSON.stringify(
      {
        mode: 'synced',
        locale: options.locale,
        ...result,
      },
      null,
      2
    )
  );
};

void main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        mode: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
