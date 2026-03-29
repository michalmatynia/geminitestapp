import 'dotenv/config';

import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';
import {
  buildKangurKnowledgeGraphSyncPayload,
  summarizeKangurKnowledgeGraphSourceIntegrity,
  syncKangurKnowledgeGraphToNeo4j,
} from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { enrichKangurKnowledgeGraphWithEmbeddings } from '@/features/kangur/server/knowledge-graph/semantic';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { DEFAULT_KANGUR_PAGE_CONTENT_STORE } from '@/features/kangur/ai-tutor/page-content-catalog';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

type CliOptions = {
  dryRun: boolean;
  locale: string;
  withEmbeddings: boolean;
};

const parseArgs = (argv: string[]): CliOptions => {
  const dryRun = argv.includes('--dry-run');
  const withEmbeddings =
    argv.includes('--with-embeddings') || process.env['KANGUR_KNOWLEDGE_GRAPH_EMBEDDINGS'] === 'true';
  const localeArg = argv.find((arg) => arg.startsWith('--locale='));
  const locale = localeArg?.split('=').slice(1).join('=').trim() || 'pl';
  return { dryRun, locale, withEmbeddings };
};

const summarizePayload = (
  payload: ReturnType<typeof buildKangurKnowledgeGraphSyncPayload>,
  sourceIntegrity: ReturnType<typeof summarizeKangurKnowledgeGraphSourceIntegrity>
) => {
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
    semanticNodeCount: payload.nodes.filter(
      (node) => typeof node['semanticText'] === 'string' && String(node['semanticText']).trim()
    ).length,
    embeddedNodeCount: payload.nodes.filter(
      (node) => Array.isArray(node['embedding']) && (node['embedding'] as unknown[]).length > 0
    ).length,
    embeddingModel:
      payload.nodes.find(
        (node) => typeof node['embeddingModel'] === 'string' && String(node['embeddingModel']).trim()
      )?.['embeddingModel'] ?? null,
    nodeCounts,
    edgeCounts,
    sourceIntegrity: {
      canonicalNodeCount: sourceIntegrity.canonicalNodeCount,
      validCanonicalNodeCount: sourceIntegrity.validCanonicalNodeCount,
      invalidCanonicalNodeCount: sourceIntegrity.invalidCanonicalNodeCount,
    },
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
  const pageContentStore = await getKangurPageContentStore(options.locale).catch(
    () => DEFAULT_KANGUR_PAGE_CONTENT_STORE
  );
  const baseSnapshot = buildKangurKnowledgeGraph({
    locale: options.locale,
    tutorContent,
    nativeGuideStore,
    pageContentStore,
  });
  const snapshot = options.withEmbeddings
    ? await enrichKangurKnowledgeGraphWithEmbeddings(baseSnapshot)
    : baseSnapshot;
  const sourceIntegrity = summarizeKangurKnowledgeGraphSourceIntegrity(snapshot);
  const payload = buildKangurKnowledgeGraphSyncPayload(snapshot);

  if (options.dryRun || !isNeo4jEnabled()) {
    console.log(
      JSON.stringify(
        {
          mode: options.dryRun ? 'dry-run' : 'preview',
          neo4jEnabled: isNeo4jEnabled(),
          summary: summarizePayload(payload, sourceIntegrity),
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
