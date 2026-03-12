import 'dotenv/config';

import { buildKangurKnowledgeGraphPreviewResult } from '@/features/kangur/server/knowledge-graph/preview';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

import {
  DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES,
  evaluateKangurKnowledgeGraphSmokeCase,
} from './lib/kangur-knowledge-graph-smoke';

const main = async (): Promise<void> => {
  const results = [];

  for (const smokeCase of DEFAULT_KANGUR_KNOWLEDGE_GRAPH_SMOKE_CASES) {
    const preview = await buildKangurKnowledgeGraphPreviewResult({
      latestUserMessage: smokeCase.message,
      learnerId: 'smoke-learner',
      locale: 'pl',
      runtimeDocuments: [],
      runtimeResolution: 'skipped',
    });
    const retrievalWebsiteHelpTarget =
      preview.retrieval.status === 'hit' ? preview.retrieval.websiteHelpTarget : null;
    const retrievalSourceCollections =
      preview.retrieval.status === 'hit' ? preview.retrieval.sourceCollections : [];
    const retrievalHydrationSources =
      preview.retrieval.status === 'hit' ? preview.retrieval.hydrationSources : [];

    const caseResult = evaluateKangurKnowledgeGraphSmokeCase({
      smokeCase,
      websiteHelpTarget: retrievalWebsiteHelpTarget,
    });

    results.push({
      ...caseResult,
      retrievalStatus: preview.retrieval.status,
      websiteHelpTarget: retrievalWebsiteHelpTarget,
      sourceCollections: retrievalSourceCollections,
      hydrationSources: retrievalHydrationSources,
    });
  }

  const failedCount = results.filter((result) => !result.passed).length;

  console.log(
    JSON.stringify(
      {
        mode: 'knowledge-graph-smoke',
        neo4jEnabled: isNeo4jEnabled(),
        passed: failedCount === 0,
        totalCount: results.length,
        failedCount,
        results,
      },
      null,
      2
    )
  );

  if (failedCount > 0) {
    process.exitCode = 1;
  }
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
