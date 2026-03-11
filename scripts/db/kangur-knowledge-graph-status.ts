import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import 'dotenv/config';

import { getKangurKnowledgeGraphSyncStatusFromNeo4j } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';

import {
  buildKangurKnowledgeGraphStatusOutput,
  resolveKangurKnowledgeGraphStatusScanStatus,
} from './lib/kangur-knowledge-graph-status-output';
import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

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
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const generatedAt = new Date().toISOString();

  if (!isNeo4jEnabled()) {
    const disabledPayload = {
      mode: 'disabled',
      graphKey: options.graphKey,
      message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
    };
    if (summaryJson) {
      writeSummaryJson({
        scannerName: 'kangur-knowledge-graph-status',
        generatedAt,
        status: 'disabled',
        summary: disabledPayload,
        filters: {
          ...buildStaticCheckFilters({ strictMode, failOnWarnings }),
          graphKey: options.graphKey,
        },
        notes: ['kangur knowledge graph status'],
      });
      return;
    }

    console.log(JSON.stringify(disabledPayload, null, 2));
    return;
  }

  const status = await getKangurKnowledgeGraphSyncStatusFromNeo4j(options.graphKey);
  const output = buildKangurKnowledgeGraphStatusOutput(status);
  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'kangur-knowledge-graph-status',
      generatedAt,
      status: resolveKangurKnowledgeGraphStatusScanStatus(output),
      summary: output,
      filters: {
        ...buildStaticCheckFilters({ strictMode, failOnWarnings }),
        graphKey: options.graphKey,
      },
      notes: ['kangur knowledge graph status'],
    });
    return;
  }

  console.log(JSON.stringify(output, null, 2));
};

void main().catch((error) => {
  const options = parseArgs(process.argv.slice(2));
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const generatedAt = new Date().toISOString();
  const payload = {
    mode: 'error',
    graphKey: options.graphKey,
    message: error instanceof Error ? error.message : String(error),
  };
  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'kangur-knowledge-graph-status',
      generatedAt,
      status: 'failed',
      summary: payload,
      filters: {
        ...buildStaticCheckFilters({ strictMode, failOnWarnings }),
      },
      notes: ['kangur knowledge graph status'],
    });
    process.exitCode = 1;
    return;
  }

  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});
