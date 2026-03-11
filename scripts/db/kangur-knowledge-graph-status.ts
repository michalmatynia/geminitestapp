import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { getKangurKnowledgeGraphSyncStatusFromNeo4j } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

type CliOptions = {
  graphKey: string;
};

const parseArgs = (argv: string[]): CliOptions => {
  const graphKeyArg = argv.find((arg) => arg.startsWith('--graph-key='));
  const graphKey = graphKeyArg?.split('=').slice(1).join('=').trim() || KANGUR_KNOWLEDGE_GRAPH_KEY;
  return { graphKey };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (!isNeo4jEnabled()) {
    console.log(
      JSON.stringify(
        {
          mode: 'disabled',
          graphKey: options.graphKey,
          message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
        },
        null,
        2
      )
    );
    return;
  }

  const status = await getKangurKnowledgeGraphSyncStatusFromNeo4j(options.graphKey);
  console.log(
    JSON.stringify(
      {
        mode: 'status',
        ...status,
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
