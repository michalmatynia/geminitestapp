import { pathToFileURL } from 'node:url';

import { getKangurAiTutorBridgeFollowUpDirection } from '@/features/kangur/ai-tutor/follow-up-reporting';
import type { KangurObservabilityRange } from '@/shared/contracts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

type AnalyticsEventMongoDoc = {
  name?: string | null;
  meta?: Record<string, unknown> | null;
};

type KangurAiTutorBridgeSnapshot = {
  range: KangurObservabilityRange;
  overallStatus: 'ok' | 'warning' | 'critical' | 'insufficient_data';
  messageSucceededCount: number;
  knowledgeGraphAppliedCount: number;
  knowledgeGraphSemanticCount: number;
  knowledgeGraphWebsiteHelpCount: number;
  knowledgeGraphMetadataOnlyRecallCount: number;
  knowledgeGraphHybridRecallCount: number;
  knowledgeGraphVectorOnlyRecallCount: number;
  knowledgeGraphVectorRecallAttemptedCount: number;
  bridgeSuggestionCount: number;
  lessonToGameBridgeSuggestionCount: number;
  gameToLessonBridgeSuggestionCount: number;
  bridgeQuickActionClickCount: number;
  bridgeFollowUpClickCount: number;
  bridgeFollowUpCompletionCount: number;
  knowledgeGraphCoverageRatePercent: number | null;
  knowledgeGraphVectorAssistRatePercent: number | null;
  bridgeCompletionRatePercent: number | null;
  alertStatus: 'ok' | 'warning' | 'critical' | 'insufficient_data';
};

const ANALYTICS_COLLECTION_NAME = 'analytics_events';
const DEFAULT_RANGE: KangurObservabilityRange = '7d';
const BRIDGE_EVENT_NAMES = [
  'kangur_ai_tutor_message_succeeded',
  'kangur_ai_tutor_quick_action_clicked',
  'kangur_ai_tutor_follow_up_clicked',
  'kangur_ai_tutor_follow_up_completed',
] as const;

const toPercent = (numerator: number, denominator: number): number | null => {
  if (denominator <= 0) {
    return null;
  }
  return Number(((numerator / denominator) * 100).toFixed(1));
};

export const parseKangurAiTutorBridgeArgs = (
  argv: string[] = process.argv.slice(2)
): { range: KangurObservabilityRange } => {
  const rangeArg = argv.find((arg) => arg.startsWith('--range=')) ?? null;
  const rawRange = rangeArg?.slice('--range='.length).trim() ?? DEFAULT_RANGE;

  if (rawRange === '24h' || rawRange === '7d' || rawRange === '30d') {
    return { range: rawRange };
  }

  return { range: DEFAULT_RANGE };
};

export const resolveKangurAiTutorBridgeWindow = (
  range: KangurObservabilityRange
): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<KangurObservabilityRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return {
    from: new Date(to.getTime() - msByRange[range]),
    to,
  };
};

export const summarizeKangurAiTutorBridgeEvents = (
  docs: AnalyticsEventMongoDoc[],
  range: KangurObservabilityRange
): KangurAiTutorBridgeSnapshot => {
  const counts = docs.reduce(
    (summary, doc) => {
      const name = doc.name;
      const meta = doc.meta;
      const actionId =
        meta && typeof meta['actionId'] === 'string' && meta['actionId'].trim().length > 0
          ? meta['actionId']
          : null;
      const bridgeDirectionFromAction = getKangurAiTutorBridgeFollowUpDirection(actionId);

      if (name === 'kangur_ai_tutor_message_succeeded') {
        summary.messageSucceededCount += 1;

        if (meta?.['knowledgeGraphApplied'] === true) {
          summary.knowledgeGraphAppliedCount += 1;
        }

        if (meta?.['knowledgeGraphQueryMode'] === 'semantic') {
          summary.knowledgeGraphSemanticCount += 1;
        }

        if (meta?.['knowledgeGraphQueryMode'] === 'website_help') {
          summary.knowledgeGraphWebsiteHelpCount += 1;
        }

        if (meta?.['knowledgeGraphRecallStrategy'] === 'metadata_only') {
          summary.knowledgeGraphMetadataOnlyRecallCount += 1;
        }

        if (meta?.['knowledgeGraphRecallStrategy'] === 'hybrid_vector') {
          summary.knowledgeGraphHybridRecallCount += 1;
        }

        if (meta?.['knowledgeGraphRecallStrategy'] === 'vector_only') {
          summary.knowledgeGraphVectorOnlyRecallCount += 1;
        }

        if (meta?.['knowledgeGraphVectorRecallAttempted'] === true) {
          summary.knowledgeGraphVectorRecallAttemptedCount += 1;
        }

        if (meta?.['hasBridgeFollowUpAction'] === true) {
          summary.bridgeSuggestionCount += 1;
        }

        if (meta?.['bridgeFollowUpDirection'] === 'lesson_to_game') {
          summary.lessonToGameBridgeSuggestionCount += 1;
        }

        if (meta?.['bridgeFollowUpDirection'] === 'game_to_lesson') {
          summary.gameToLessonBridgeSuggestionCount += 1;
        }
      }

      if (name === 'kangur_ai_tutor_quick_action_clicked' && meta?.['isBridgeAction'] === true) {
        summary.bridgeQuickActionClickCount += 1;
      }

      if (name === 'kangur_ai_tutor_follow_up_clicked' && bridgeDirectionFromAction) {
        summary.bridgeFollowUpClickCount += 1;
      }

      if (name === 'kangur_ai_tutor_follow_up_completed' && bridgeDirectionFromAction) {
        summary.bridgeFollowUpCompletionCount += 1;
      }

      return summary;
    },
    {
      messageSucceededCount: 0,
      knowledgeGraphAppliedCount: 0,
      knowledgeGraphSemanticCount: 0,
      knowledgeGraphWebsiteHelpCount: 0,
      knowledgeGraphMetadataOnlyRecallCount: 0,
      knowledgeGraphHybridRecallCount: 0,
      knowledgeGraphVectorOnlyRecallCount: 0,
      knowledgeGraphVectorRecallAttemptedCount: 0,
      bridgeSuggestionCount: 0,
      lessonToGameBridgeSuggestionCount: 0,
      gameToLessonBridgeSuggestionCount: 0,
      bridgeQuickActionClickCount: 0,
      bridgeFollowUpClickCount: 0,
      bridgeFollowUpCompletionCount: 0,
    }
  );

  const bridgeCompletionRatePercent = toPercent(
    counts.bridgeFollowUpCompletionCount,
    counts.bridgeSuggestionCount
  );
  const knowledgeGraphCoverageRatePercent = toPercent(
    counts.knowledgeGraphAppliedCount,
    counts.messageSucceededCount
  );
  const knowledgeGraphVectorAssistRatePercent = toPercent(
    counts.knowledgeGraphHybridRecallCount + counts.knowledgeGraphVectorOnlyRecallCount,
    counts.knowledgeGraphSemanticCount
  );

  const alertStatus: KangurAiTutorBridgeSnapshot['alertStatus'] =
    counts.bridgeSuggestionCount < 5 || bridgeCompletionRatePercent === null
      ? 'insufficient_data'
      : bridgeCompletionRatePercent < 20
        ? 'critical'
        : bridgeCompletionRatePercent < 40
          ? 'warning'
          : 'ok';

  return {
    range,
    overallStatus: alertStatus,
    ...counts,
    knowledgeGraphCoverageRatePercent,
    knowledgeGraphVectorAssistRatePercent,
    bridgeCompletionRatePercent,
    alertStatus,
  };
};

export const loadKangurAiTutorBridgeEvents = async (
  range: KangurObservabilityRange
): Promise<{
  window: { from: string; to: string };
  docs: AnalyticsEventMongoDoc[];
}> => {
  const { from, to } = resolveKangurAiTutorBridgeWindow(range);
  const mongo = await getMongoDb();
  const collection = mongo.collection<AnalyticsEventMongoDoc>(ANALYTICS_COLLECTION_NAME);

  const docs = await collection
    .find(
      {
        ts: { $gte: from, $lt: to },
        scope: 'public',
        $or: [{ path: /^\/kangur(?:\/|$)/i }, { 'meta.feature': 'kangur' }],
        type: 'event',
        name: { $in: [...BRIDGE_EVENT_NAMES] },
      },
      {
        projection: {
          name: 1,
          meta: 1,
        },
      }
    )
    .toArray();

  return {
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    docs,
  };
};

export const runKangurAiTutorBridgeCheck = async ({
  range,
}: {
  range: KangurObservabilityRange;
}): Promise<{
  generatedAt: string;
  snapshot: KangurAiTutorBridgeSnapshot;
  window: { from: string; to: string };
}> => {
  const { docs, window } = await loadKangurAiTutorBridgeEvents(range);

  return {
    generatedAt: new Date().toISOString(),
    snapshot: summarizeKangurAiTutorBridgeEvents(docs, range),
    window,
  };
};

const buildFailedSnapshot = (range: KangurObservabilityRange): KangurAiTutorBridgeSnapshot => ({
  range,
  overallStatus: 'insufficient_data',
  messageSucceededCount: 0,
  knowledgeGraphAppliedCount: 0,
  knowledgeGraphSemanticCount: 0,
  knowledgeGraphWebsiteHelpCount: 0,
  knowledgeGraphMetadataOnlyRecallCount: 0,
  knowledgeGraphHybridRecallCount: 0,
  knowledgeGraphVectorOnlyRecallCount: 0,
  knowledgeGraphVectorRecallAttemptedCount: 0,
  bridgeSuggestionCount: 0,
  lessonToGameBridgeSuggestionCount: 0,
  gameToLessonBridgeSuggestionCount: 0,
  bridgeQuickActionClickCount: 0,
  bridgeFollowUpClickCount: 0,
  bridgeFollowUpCompletionCount: 0,
  knowledgeGraphCoverageRatePercent: null,
  knowledgeGraphVectorAssistRatePercent: null,
  bridgeCompletionRatePercent: null,
  alertStatus: 'insufficient_data',
});

const printHumanSummary = (snapshot: KangurAiTutorBridgeSnapshot): void => {
  console.log(`Kangur AI Tutor bridge snapshot (${snapshot.range})`);
  console.log(`- Tutor replies: ${snapshot.messageSucceededCount}`);
  console.log(`- Neo4j-backed replies: ${snapshot.knowledgeGraphAppliedCount}`);
  console.log(
    `- Graph coverage rate: ${snapshot.knowledgeGraphCoverageRatePercent === null ? 'n/a' : `${snapshot.knowledgeGraphCoverageRatePercent.toFixed(1)}%`}`
  );
  console.log(`- Semantic graph replies: ${snapshot.knowledgeGraphSemanticCount}`);
  console.log(`- Website-help graph replies: ${snapshot.knowledgeGraphWebsiteHelpCount}`);
  console.log(
    `- Recall split: metadata=${snapshot.knowledgeGraphMetadataOnlyRecallCount} | hybrid=${snapshot.knowledgeGraphHybridRecallCount} | vector-only=${snapshot.knowledgeGraphVectorOnlyRecallCount}`
  );
  console.log(
    `- Vector assist rate: ${snapshot.knowledgeGraphVectorAssistRatePercent === null ? 'n/a' : `${snapshot.knowledgeGraphVectorAssistRatePercent.toFixed(1)}%`}`
  );
  console.log(
    `- Vector recall attempts: ${snapshot.knowledgeGraphVectorRecallAttemptedCount}`
  );
  console.log(`- Bridge suggestions: ${snapshot.bridgeSuggestionCount}`);
  console.log(`- Lekcja -> Grajmy: ${snapshot.lessonToGameBridgeSuggestionCount}`);
  console.log(`- Grajmy -> Lekcja: ${snapshot.gameToLessonBridgeSuggestionCount}`);
  console.log(`- Bridge quick action clicks: ${snapshot.bridgeQuickActionClickCount}`);
  console.log(`- Bridge follow-up opens: ${snapshot.bridgeFollowUpClickCount}`);
  console.log(`- Bridge completions: ${snapshot.bridgeFollowUpCompletionCount}`);
  console.log(
    `- Bridge completion rate: ${snapshot.bridgeCompletionRatePercent === null ? 'n/a' : `${snapshot.bridgeCompletionRatePercent.toFixed(1)}%`}`
  );
  console.log(`- Alert status: ${snapshot.alertStatus}`);
};

const main = async (): Promise<void> => {
  const { summaryJson, strictMode, failOnWarnings } = parseCommonCheckArgs();
  const { range } = parseKangurAiTutorBridgeArgs();

  let result;
  try {
    result = await runKangurAiTutorBridgeCheck({ range });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (summaryJson) {
      writeSummaryJson({
        scannerName: 'kangur-ai-tutor-bridge-snapshot',
        generatedAt: new Date().toISOString(),
        status: 'failed',
        summary: buildFailedSnapshot(range),
        details: {
          error: message,
        },
        filters: {
          ...buildStaticCheckFilters({ strictMode, failOnWarnings }),
          range,
        },
        notes: ['kangur ai tutor bridge snapshot'],
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'kangur-ai-tutor-bridge-snapshot',
      generatedAt: result.generatedAt,
      status: 'ok',
      summary: result.snapshot,
      details: {
        window: result.window,
      },
      filters: {
        ...buildStaticCheckFilters({ strictMode, failOnWarnings }),
        range,
      },
      notes: ['kangur ai tutor bridge snapshot'],
    });
    return;
  }

  printHumanSummary(result.snapshot);
};

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
