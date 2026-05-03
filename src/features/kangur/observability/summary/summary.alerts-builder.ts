import type { KangurAnalyticsSnapshot, KangurObservabilityAlert, KangurObservabilityRange, KangurObservabilityStatus, KangurPerformanceBaseline, KangurRouteMetrics } from '@/shared/contracts/kangur-observability';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';
import type { SystemLogMetricsDto as SystemLogMetrics } from '@/shared/contracts/observability';
import { SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS } from '@/shared/lib/observability/workers/system-log-alerts/config';
import {
  KANGUR_ROUTE_DEFINITIONS,
} from './summary.constants';
import { type KangurKnowledgeGraphFreshnessSnapshot } from './summary.contracts';
import { eventCount, resolveKnowledgeGraphAlertStatus, buildKnowledgeGraphAlertSummary, rateStatus, countStatus, valueStatus, minimumRateStatus, scaleCountThreshold, buildKangurObservabilitySectionHref } from './summary.alerts';
import { toPercent } from './summary.analytics';
import { buildSystemLogsHref } from './summary.routes';
import { toIso, describeFreshnessSources, describeFreshnessVerb, formatFreshnessLag } from './summary.freshness';

export const buildKangurObservabilityAlerts = (input: {
  range: KangurObservabilityRange;
  from: Date;
  to: Date;
  serverLogMetrics: SystemLogMetrics | null;
  routeMetrics: KangurRouteMetrics;
  analytics: KangurAnalyticsSnapshot;
  knowledgeGraphStatus?: KangurKnowledgeGraphStatusSnapshot;
  knowledgeGraphFreshness?: KangurKnowledgeGraphFreshnessSnapshot | null;
  ttsRequestCount: number;
  ttsGenerationFailureCount: number;
  ttsFallbackCount: number;
  performanceBaseline: KangurPerformanceBaseline | null;
}): KangurObservabilityAlert[] => {
  const signInSuccessCount = eventCount(input.analytics, 'kangur_learner_signin_succeeded');
  const signInFailureCount = eventCount(input.analytics, 'kangur_learner_signin_failed');
  const signInAttemptCount = signInSuccessCount + signInFailureCount;
  const progressSyncFailureCount = eventCount(input.analytics, 'kangur_progress_sync_failed');
  const progressPatchLatency = input.routeMetrics.progressPatch.latency;
  const serverErrorCount = input.serverLogMetrics?.levels.error ?? 0;
  const serverTotalCount = input.serverLogMetrics?.total ?? 0;
  const aiTutorBridgeSuggestionCount = input.analytics.aiTutor.bridgeSuggestionCount;
  const aiTutorBridgeCompletionCount = input.analytics.aiTutor.bridgeFollowUpCompletionCount;
  const aiTutorReplyCount = input.analytics.aiTutor.messageSucceededCount;
  const aiTutorDirectAnswerCount =
    input.analytics.aiTutor.pageContentAnswerCount + input.analytics.aiTutor.nativeGuideAnswerCount;
  const aiTutorGraphCoverageCount = input.analytics.aiTutor.knowledgeGraphAppliedCount;
  const aiTutorSemanticGraphCount = input.analytics.aiTutor.knowledgeGraphSemanticCount;
  const aiTutorVectorAssistCount =
    input.analytics.aiTutor.knowledgeGraphHybridRecallCount +
    input.analytics.aiTutor.knowledgeGraphVectorOnlyRecallCount;
  const serverErrorRatePercent = toPercent(serverErrorCount, serverTotalCount);
  const signInFailureRatePercent = toPercent(signInFailureCount, signInAttemptCount);
  const ttsFallbackRatePercent = toPercent(input.ttsFallbackCount, input.ttsRequestCount);
  const aiTutorDirectAnswerRatePercent =
    input.analytics.aiTutor.directAnswerRatePercent ??
    toPercent(aiTutorDirectAnswerCount, aiTutorReplyCount);
  const aiTutorGraphCoverageRatePercent =
    input.analytics.aiTutor.knowledgeGraphCoverageRatePercent ??
    toPercent(aiTutorGraphCoverageCount, aiTutorReplyCount);
  const aiTutorBridgeCompletionRatePercent =
    input.analytics.aiTutor.bridgeCompletionRatePercent ??
    toPercent(aiTutorBridgeCompletionCount, aiTutorBridgeSuggestionCount);
  const aiTutorVectorAssistRatePercent =
    input.analytics.aiTutor.knowledgeGraphVectorAssistRatePercent ??
    toPercent(aiTutorVectorAssistCount, aiTutorSemanticGraphCount);
  const progressWarningThreshold = scaleCountThreshold(input.range, 3);
  const progressCriticalThreshold = scaleCountThreshold(input.range, 10);
  const ttsGenerationWarningThreshold = scaleCountThreshold(input.range, 1);
  const ttsGenerationCriticalThreshold = scaleCountThreshold(input.range, 3);
  const recentAnalyticsHref = buildKangurObservabilitySectionHref(
    input.range,
    'recent-analytics-events'
  );
  const aiTutorBridgeHref = buildKangurObservabilitySectionHref(input.range, 'ai-tutor-bridge');
  const knowledgeGraphStatusHref = buildKangurObservabilitySectionHref(
    input.range,
    'knowledge-graph-status'
  );
  const performanceBaselineHref = buildKangurObservabilitySectionHref(
    input.range,
    'performance-baseline'
  );
  const knowledgeGraphFreshnessHref = buildKangurObservabilitySectionHref(
    input.range,
    'knowledge-graph-status'
  );
  const knowledgeGraphFreshness = input.knowledgeGraphFreshness ?? null;
  const knowledgeGraphFreshnessStatus: KangurObservabilityStatus =
    !knowledgeGraphFreshness?.graphSyncedAt || !knowledgeGraphFreshness.latestCanonicalUpdateAt
      ? 'insufficient_data'
      : knowledgeGraphFreshness.staleSources.length === 0
        ? 'ok'
        : (knowledgeGraphFreshness.lagMs ?? 0) >= 24 * 60 * 60 * 1000
          ? 'critical'
          : 'warning';
  const knowledgeGraphFreshnessSummary = !knowledgeGraphFreshness?.graphSyncedAt
    ? 'Neo4j sync timestamp is unavailable, so freshness cannot be compared against canonical Tutor content.'
    : !knowledgeGraphFreshness.latestCanonicalUpdateAt
      ? 'No Mongo-backed page content or native guide updates are available for Neo4j freshness comparison yet.'
      : knowledgeGraphFreshness.staleSources.length === 0
        ? 'Neo4j sync is current with the latest Mongo-backed page content and native guide updates.'
        : `${describeFreshnessSources(knowledgeGraphFreshness.staleSources)} ${describeFreshnessVerb(knowledgeGraphFreshness.staleSources)} updated after the latest Neo4j sync by about ${formatFreshnessLag(knowledgeGraphFreshness.lagMs ?? 0)}. Last graph sync: ${toIso(knowledgeGraphFreshness.graphSyncedAt)}. Latest canonical update: ${toIso(knowledgeGraphFreshness.latestCanonicalUpdateAt)}.`;
  const performanceStatus: KangurObservabilityStatus = !input.performanceBaseline
    ? 'insufficient_data'
    : input.performanceBaseline.unitStatus !== 'pass'
      ? 'critical'
      : input.performanceBaseline.e2eStatus === 'fail'
        ? 'critical'
        : input.performanceBaseline.e2eStatus === 'infra_fail'
          ? 'warning'
          : 'ok';
  const aiTutorBridgeCompletionStatus: KangurObservabilityStatus =
    aiTutorBridgeSuggestionCount < 5 || aiTutorBridgeCompletionRatePercent === null
      ? 'insufficient_data'
      : aiTutorBridgeCompletionRatePercent < 20
        ? 'critical'
        : aiTutorBridgeCompletionRatePercent < 40
          ? 'warning'
          : 'ok';
  return [
    {
      id: 'kangur-knowledge-graph-readiness',
      title: 'Knowledge Graph Readiness',
      status: resolveKnowledgeGraphAlertStatus(input.knowledgeGraphStatus),
      value: null,
      unit: 'status',
      warningThreshold: null,
      criticalThreshold: null,
      summary: buildKnowledgeGraphAlertSummary(input.knowledgeGraphStatus),
      investigation: {
        label: 'Open graph status',
        href: knowledgeGraphStatusHref,
      },
    },
    {
      id: 'kangur-knowledge-graph-freshness',
      title: 'Knowledge Graph Freshness',
      status: knowledgeGraphFreshnessStatus,
      value:
        knowledgeGraphFreshness?.lagMs !== null && knowledgeGraphFreshness?.lagMs !== undefined
          ? Number((knowledgeGraphFreshness.lagMs / (60 * 60 * 1000)).toFixed(1))
          : null,
      unit: 'hours',
      warningThreshold: 0,
      criticalThreshold: 24,
      summary: knowledgeGraphFreshnessSummary,
      investigation: {
        label: 'Open graph status',
        href: knowledgeGraphFreshnessHref,
      },
    },
    {
      id: 'kangur-server-error-rate',
      title: 'Kangur Server Error Rate',
      status: rateStatus(serverErrorRatePercent, {
        warningThreshold: 2,
        criticalThreshold: 5,
        minSample: 20,
        sampleSize: serverTotalCount,
      }),
      value: serverErrorRatePercent,
      unit: '%',
      warningThreshold: 2,
      criticalThreshold: 5,
      summary:
        serverTotalCount < 20
          ? 'Insufficient Kangur log volume to evaluate server error rate confidently.'
          : `${serverErrorCount} error logs out of ${serverTotalCount} Kangur logs in the selected window.`,
      investigation: {
        label: 'View error logs',
        href: buildSystemLogsHref({
          query: 'kangur.',
          level: 'error',
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-learner-signin-failure-rate',
      title: 'Learner Sign-In Failure Rate',
      status: rateStatus(signInFailureRatePercent, {
        warningThreshold: 5,
        criticalThreshold: 10,
        minSample: 10,
        sampleSize: signInAttemptCount,
      }),
      value: signInFailureRatePercent,
      unit: '%',
      warningThreshold: 5,
      criticalThreshold: 10,
      summary:
        signInAttemptCount < 10
          ? 'Insufficient sign-in attempts to evaluate learner sign-in failure rate.'
          : `${signInFailureCount} failed learner sign-ins out of ${signInAttemptCount} attempts.`,
      investigation: {
        label: 'Review sign-in analytics',
        href: recentAnalyticsHref,
      },
    },
    {
      id: 'kangur-progress-sync-failures',
      title: 'Progress Sync Failures',
      status: countStatus(progressSyncFailureCount, {
        warningThreshold: progressWarningThreshold,
        criticalThreshold: progressCriticalThreshold,
      }),
      value: progressSyncFailureCount,
      unit: 'events',
      warningThreshold: progressWarningThreshold,
      criticalThreshold: progressCriticalThreshold,
      summary: `${progressSyncFailureCount} client progress sync failures were reported in the selected window.`,
      investigation: {
        label: 'Review sync analytics',
        href: recentAnalyticsHref,
      },
    },
    {
      id: 'kangur-progress-sync-latency',
      title: 'Progress Sync Route Latency',
      status: valueStatus(progressPatchLatency?.p95DurationMs ?? null, {
        warningThreshold: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS,
        criticalThreshold: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS * 2,
        minSample: 10,
        sampleSize: progressPatchLatency?.sampleSize ?? 0,
      }),
      value: progressPatchLatency?.p95DurationMs ?? null,
      unit: 'ms',
      warningThreshold: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS,
      criticalThreshold: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS * 2,
      summary:
        (progressPatchLatency?.sampleSize ?? 0) < 10
          ? 'Insufficient progress sync request samples to evaluate p95 latency.'
          : `Progress sync p95 latency is ${progressPatchLatency?.p95DurationMs ?? 0} ms across ${progressPatchLatency?.sampleSize ?? 0} requests.`,
      investigation: {
        label: 'View slow sync logs',
        href: buildSystemLogsHref({
          source: KANGUR_ROUTE_DEFINITIONS.progressPatch.source,
          minDurationMs: SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS,
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-tts-generation-failures',
      title: 'TTS Generation Failures',
      status: countStatus(input.ttsGenerationFailureCount, {
        warningThreshold: ttsGenerationWarningThreshold,
        criticalThreshold: ttsGenerationCriticalThreshold,
      }),
      value: input.ttsGenerationFailureCount,
      unit: 'events',
      warningThreshold: ttsGenerationWarningThreshold,
      criticalThreshold: ttsGenerationCriticalThreshold,
      summary:
        input.ttsGenerationFailureCount === 0
          ? 'No server-side Kangur neural narration generation failures were logged in the selected window.'
          : `${input.ttsGenerationFailureCount} server-side Kangur neural narration generation failures were logged before fallback handling.`,
      investigation: {
        label: 'View generation failure logs',
        href: buildSystemLogsHref({
          source: 'kangur.tts.generationFailed',
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-tts-fallback-rate',
      title: 'TTS Fallback Rate',
      status: rateStatus(ttsFallbackRatePercent, {
        warningThreshold: 10,
        criticalThreshold: 25,
        minSample: 10,
        sampleSize: input.ttsRequestCount,
      }),
      value: ttsFallbackRatePercent,
      unit: '%',
      warningThreshold: 10,
      criticalThreshold: 25,
      summary:
        input.ttsRequestCount < 10
          ? 'Insufficient TTS request volume to evaluate fallback rate.'
          : `${input.ttsFallbackCount} fallback responses out of ${input.ttsRequestCount} TTS requests.`,
      investigation: {
        label: 'View fallback logs',
        href: buildSystemLogsHref({
          source: 'kangur.tts.fallback',
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-ai-tutor-direct-answer-rate',
      title: 'AI Tutor Direct Answer Rate',
      status: minimumRateStatus(aiTutorDirectAnswerRatePercent, {
        warningThreshold: 60,
        criticalThreshold: 30,
        minSample: 10,
        sampleSize: aiTutorReplyCount,
      }),
      value: aiTutorDirectAnswerRatePercent,
      unit: '%',
      warningThreshold: 60,
      criticalThreshold: 30,
      summary:
        aiTutorReplyCount < 10
          ? 'Insufficient AI Tutor reply volume to evaluate deterministic section-answer coverage reliably.'
          : `${aiTutorDirectAnswerCount} Tutor replies were resolved directly from page content or native guides out of ${aiTutorReplyCount} successful Tutor replies in the selected window.`,
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: aiTutorBridgeHref,
      },
    },
    {
      id: 'kangur-ai-tutor-graph-coverage-rate',
      title: 'AI Tutor Graph Coverage Rate',
      status: minimumRateStatus(aiTutorGraphCoverageRatePercent, {
        warningThreshold: 60,
        criticalThreshold: 30,
        minSample: 10,
        sampleSize: aiTutorReplyCount,
      }),
      value: aiTutorGraphCoverageRatePercent,
      unit: '%',
      warningThreshold: 60,
      criticalThreshold: 30,
      summary:
        aiTutorReplyCount < 10
          ? 'Insufficient AI Tutor reply volume to evaluate Neo4j graph coverage reliably.'
          : `${aiTutorGraphCoverageCount} Neo4j-backed Tutor replies out of ${aiTutorReplyCount} successful Tutor replies in the selected window.`,
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: aiTutorBridgeHref,
      },
    },
    {
      id: 'kangur-ai-tutor-vector-assist-rate',
      title: 'AI Tutor Vector Assist Rate',
      status: minimumRateStatus(aiTutorVectorAssistRatePercent, {
        warningThreshold: 40,
        criticalThreshold: 15,
        minSample: 5,
        sampleSize: aiTutorSemanticGraphCount,
      }),
      value: aiTutorVectorAssistRatePercent,
      unit: '%',
      warningThreshold: 40,
      criticalThreshold: 15,
      summary:
        aiTutorSemanticGraphCount < 5
          ? 'Insufficient semantic Tutor reply volume to evaluate vector-assisted Neo4j recall reliably.'
          : `${aiTutorVectorAssistCount} semantic Tutor replies used hybrid or vector-only recall out of ${aiTutorSemanticGraphCount} semantic graph replies.`,
      investigation: {
        label: 'Open AI Tutor graph metrics',
        href: aiTutorBridgeHref,
      },
    },
    {
      id: 'kangur-ai-tutor-bridge-completion-rate',
      title: 'AI Tutor Bridge Completion Rate',
      status: aiTutorBridgeCompletionStatus,
      value: aiTutorBridgeCompletionRatePercent,
      unit: '%',
      warningThreshold: 40,
      criticalThreshold: 20,
      summary:
        aiTutorBridgeSuggestionCount < 5
          ? 'Insufficient AI Tutor bridge suggestion volume to evaluate cross-surface completion reliably.'
          : `${aiTutorBridgeCompletionCount} completed bridge follow-ups out of ${aiTutorBridgeSuggestionCount} bridge suggestions in the selected window.`,
      investigation: {
        label: 'Review tutor bridge analytics',
        href: recentAnalyticsHref,
      },
    },
    {
      id: 'kangur-performance-baseline',
      title: 'Kangur Performance Baseline',
      status: performanceStatus,
      value: null,
      unit: 'status',
      warningThreshold: null,
      criticalThreshold: null,
      summary: !input.performanceBaseline
        ? 'Kangur performance baseline artifact is missing.'
        : `Latest baseline unit=${input.performanceBaseline.unitStatus ?? 'unknown'}, e2e=${input.performanceBaseline.e2eStatus ?? 'unknown'}.`,
      investigation: {
        label: 'Open baseline details',
        href: performanceBaselineHref,
      },
    },
  ];
};
