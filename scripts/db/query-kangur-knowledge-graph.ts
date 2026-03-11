import 'dotenv/config';

import { buildKangurKnowledgeGraphPreviewResult } from '@/features/kangur/server/knowledge-graph/preview';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

import { parseKangurKnowledgeGraphQueryArgs } from './lib/kangur-knowledge-graph-query';

const main = async (): Promise<void> => {
  const options = parseKangurKnowledgeGraphQueryArgs(process.argv.slice(2));
  const preview = await buildKangurKnowledgeGraphPreviewResult({
    latestUserMessage: options.latestUserMessage,
    learnerId: options.learnerId,
    locale: options.locale,
    context: options.context,
    runtimeDocuments: [],
    runtimeResolution: 'skipped',
  });

  console.log(
    JSON.stringify(
      {
        mode: 'query-preview',
        neo4jEnabled: isNeo4jEnabled(),
        ...preview,
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
