import type {
  AiPathRunQueueSloStatus,
  QueueSloThresholds,
  SloLevel,
} from '@/shared/contracts/ai-paths-runtime';

import { parseEnvNumber } from './ai-path-run-queue-utils';

export type { AiPathRunQueueSloStatus, QueueSloThresholds, SloLevel };

export type ComputeQueueSloInput = {
  queueRunning: boolean;
  queueHealthy: boolean;
  queueLagMs: number | null;
  successRate24h: number;
  terminalRuns24h: number;
  deadLetterRate24h: number;
  brainErrorRate24h: number;
  brainTotalReports24h: number;
};

const parseEnvFloat = (
  name: string,
  fallback: number,
  min: number = 0,
  max: number = 100
): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const resolveQueueSloThresholds = (): QueueSloThresholds => ({
  queueLagWarningMs: parseEnvNumber('AI_PATHS_SLO_QUEUE_LAG_WARNING_MS', 60_000, 1_000),
  queueLagCriticalMs: parseEnvNumber('AI_PATHS_SLO_QUEUE_LAG_CRITICAL_MS', 180_000, 1_000),
  successRateWarningPct: parseEnvFloat('AI_PATHS_SLO_SUCCESS_RATE_WARNING_PCT', 95, 0, 100),
  successRateCriticalPct: parseEnvFloat('AI_PATHS_SLO_SUCCESS_RATE_CRITICAL_PCT', 90, 0, 100),
  deadLetterRateWarningPct: parseEnvFloat('AI_PATHS_SLO_DEAD_LETTER_RATE_WARNING_PCT', 1, 0, 100),
  deadLetterRateCriticalPct: parseEnvFloat('AI_PATHS_SLO_DEAD_LETTER_RATE_CRITICAL_PCT', 3, 0, 100),
  brainErrorRateWarningPct: parseEnvFloat('AI_PATHS_SLO_BRAIN_ERROR_RATE_WARNING_PCT', 5, 0, 100),
  brainErrorRateCriticalPct: parseEnvFloat(
    'AI_PATHS_SLO_BRAIN_ERROR_RATE_CRITICAL_PCT',
    15,
    0,
    100
  ),
  minTerminalSamples: parseEnvNumber('AI_PATHS_SLO_MIN_TERMINAL_SAMPLES', 10, 1),
  minBrainSamples: parseEnvNumber('AI_PATHS_SLO_MIN_BRAIN_SAMPLES', 20, 1),
});

const severityRank: Record<SloLevel, number> = {
  ok: 0,
  warning: 1,
  critical: 2,
};

export const maxSloLevel = (levels: SloLevel[]): SloLevel => {
  return levels.reduce((max, current) => {
    if (severityRank[current] > severityRank[max]) return current;
    return max;
  }, 'ok' as SloLevel);
};

const classifyGreaterIsWorse = (value: number, warning: number, critical: number): SloLevel => {
  if (value >= Math.max(warning, critical)) return 'critical';
  if (value >= Math.min(warning, critical)) return 'warning';
  return 'ok';
};

const classifyLowerIsWorse = (value: number, warning: number, critical: number): SloLevel => {
  if (value <= Math.min(warning, critical)) return 'critical';
  if (value <= Math.max(warning, critical)) return 'warning';
  return 'ok';
};

export const computeAiPathRunQueueSlo = (
  input: ComputeQueueSloInput,
  thresholds: QueueSloThresholds = resolveQueueSloThresholds()
): AiPathRunQueueSloStatus => {
  const breaches: AiPathRunQueueSloStatus['breaches'] = [];

  const workerHealthLevel: SloLevel = !input.queueRunning
    ? 'critical'
    : input.queueHealthy
      ? 'ok'
      : 'warning';
  const workerHealthMessage = !input.queueRunning
    ? 'Worker is stopped.'
    : input.queueHealthy
      ? 'Worker is healthy.'
      : 'Worker is running but not healthy.';
  if (workerHealthLevel !== 'ok') {
    breaches.push({
      indicator: 'workerHealth',
      level: workerHealthLevel,
      message: workerHealthMessage,
    });
  }

  const lagValue = input.queueLagMs ?? 0;
  const queueLagLevel =
    input.queueLagMs === null
      ? 'ok'
      : classifyGreaterIsWorse(
          lagValue,
          thresholds.queueLagWarningMs,
          thresholds.queueLagCriticalMs
        );
  const queueLagMessage =
    input.queueLagMs === null
      ? 'No queued runs.'
      : `Lag ${lagValue}ms (warn ${thresholds.queueLagWarningMs}ms / critical ${thresholds.queueLagCriticalMs}ms).`;
  if (queueLagLevel !== 'ok') {
    breaches.push({
      indicator: 'queueLag',
      level: queueLagLevel,
      message: queueLagMessage,
    });
  }

  const hasTerminalSample = input.terminalRuns24h >= thresholds.minTerminalSamples;
  const successRateLevel = hasTerminalSample
    ? classifyLowerIsWorse(
        input.successRate24h,
        thresholds.successRateWarningPct,
        thresholds.successRateCriticalPct
      )
    : 'ok';
  const successRateMessage = hasTerminalSample
    ? `Success ${input.successRate24h.toFixed(2)}% over ${input.terminalRuns24h} terminal runs.`
    : `Insufficient sample (${input.terminalRuns24h}/${thresholds.minTerminalSamples}) for success-rate SLO.`;
  if (successRateLevel !== 'ok') {
    breaches.push({
      indicator: 'successRate24h',
      level: successRateLevel,
      message: successRateMessage,
    });
  }

  const deadLetterLevel = hasTerminalSample
    ? classifyGreaterIsWorse(
        input.deadLetterRate24h,
        thresholds.deadLetterRateWarningPct,
        thresholds.deadLetterRateCriticalPct
      )
    : 'ok';
  const deadLetterMessage = hasTerminalSample
    ? `Dead-letter rate ${input.deadLetterRate24h.toFixed(2)}% over ${input.terminalRuns24h} terminal runs.`
    : `Insufficient sample (${input.terminalRuns24h}/${thresholds.minTerminalSamples}) for dead-letter SLO.`;
  if (deadLetterLevel !== 'ok') {
    breaches.push({
      indicator: 'deadLetterRate24h',
      level: deadLetterLevel,
      message: deadLetterMessage,
    });
  }

  const hasBrainSample = input.brainTotalReports24h >= thresholds.minBrainSamples;
  const brainErrorLevel = hasBrainSample
    ? classifyGreaterIsWorse(
        input.brainErrorRate24h,
        thresholds.brainErrorRateWarningPct,
        thresholds.brainErrorRateCriticalPct
      )
    : 'ok';
  const brainErrorMessage = hasBrainSample
    ? `Brain error ${input.brainErrorRate24h.toFixed(2)}% over ${input.brainTotalReports24h} total reports.`
    : `Insufficient sample (${input.brainTotalReports24h}/${thresholds.minBrainSamples}) for brain-health SLO.`;
  if (brainErrorLevel !== 'ok') {
    breaches.push({
      indicator: 'brainErrorRate24h',
      level: brainErrorLevel,
      message: brainErrorMessage,
    });
  }

  const overall = maxSloLevel(breaches.map((b) => b.level));

  return {
    overall,
    evaluatedAt: new Date().toISOString(),
    thresholds,
    indicators: {
      workerHealth: {
        level: workerHealthLevel,
        running: input.queueRunning,
        healthy: input.queueHealthy,
        message: workerHealthMessage,
      },
      queueLag: {
        level: queueLagLevel,
        valueMs: input.queueLagMs,
        message: queueLagMessage,
      },
      successRate24h: {
        level: successRateLevel,
        valuePct: input.successRate24h,
        sampleSize: input.terminalRuns24h,
        message: successRateMessage,
      },
      deadLetterRate24h: {
        level: deadLetterLevel,
        valuePct: input.deadLetterRate24h,
        sampleSize: input.terminalRuns24h,
        message: deadLetterMessage,
      },
      brainErrorRate24h: {
        level: brainErrorLevel,
        valuePct: input.brainErrorRate24h,
        sampleSize: input.brainTotalReports24h,
        message: brainErrorMessage,
      },
    },
    breachCount: breaches.length,
    breaches,
  };
};
