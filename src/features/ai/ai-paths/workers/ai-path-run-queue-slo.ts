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
  if (raw === undefined) return fallback;
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
  let maxLevel: SloLevel = 'ok';
  for (const level of levels) {
    if (severityRank[level] > severityRank[maxLevel]) {
      maxLevel = level;
    }
  }
  return maxLevel;
};

const checkThreshold = (
  value: number,
  warning: number,
  critical: number,
  greaterIsWorse = true
): SloLevel => {
  const isCritical = greaterIsWorse ? value >= critical : value <= critical;
  if (isCritical) return 'critical';
  const isWarning = greaterIsWorse ? value >= warning : value <= warning;
  if (isWarning) return 'warning';
  return 'ok';
};

const getWorkerHealth = (running: boolean, healthy: boolean): { level: SloLevel, message: string } => {
  if (!running) return { level: 'critical', message: 'Worker is stopped.' };
  if (healthy) return { level: 'ok', message: 'Worker is healthy.' };
  return { level: 'warning', message: 'Worker is running but not healthy.' };
};

const getLagIndicator = (lag: number | null, warn: number, crit: number): { level: SloLevel, message: string } => {
  if (lag === null) return { level: 'ok', message: 'No queued runs.' };
  const level = checkThreshold(lag, warn, crit);
  const message = `Lag ${lag}ms (warn ${warn}ms / critical ${crit}ms).`;
  return { level, message };
};

type RateIndicator = { level: SloLevel, message: string, rate: number, runs: number };
const getRateIndicator = (
  rate: number,
  options: { warn: number, crit: number, label: string, runs: number, min: number, greaterIsWorse?: boolean }
): RateIndicator => {
  const { warn, crit, label, runs, min, greaterIsWorse = true } = options;
  if (runs < min) {
    return { level: 'ok', message: `Insufficient sample (${runs}/${min}) for ${label} SLO.`, rate, runs };
  }
  const level = checkThreshold(rate, warn, crit, greaterIsWorse);
  const message = `${label} ${rate.toFixed(2)}% over ${runs} terminal runs.`;
  return { level, message, rate, runs };
};

export const computeAiPathRunQueueSlo = (
  input: ComputeQueueSloInput,
  thresholds: QueueSloThresholds = resolveQueueSloThresholds()
): AiPathRunQueueSloStatus => {
  const breaches: AiPathRunQueueSloStatus['breaches'] = [];
  const add = (indicator: keyof AiPathRunQueueSloStatus['indicators'], level: SloLevel, message: string): void => {
    if (level !== 'ok') breaches.push({ indicator, level, message });
  };

  const health = getWorkerHealth(input.queueRunning, input.queueHealthy);
  add('workerHealth', health.level, health.message);

  const lag = getLagIndicator(input.queueLagMs, thresholds.queueLagWarningMs, thresholds.queueLagCriticalMs);
  add('queueLag', lag.level, lag.message);

  const success = getRateIndicator(input.successRate24h, { 
    warn: thresholds.successRateWarningPct, 
    crit: thresholds.successRateCriticalPct, 
    label: 'Success', 
    runs: input.terminalRuns24h, 
    min: thresholds.minTerminalSamples, 
    greaterIsWorse: false 
  });
  add('successRate24h', success.level, success.message);

  const dead = getRateIndicator(input.deadLetterRate24h, { 
    warn: thresholds.deadLetterRateWarningPct, 
    crit: thresholds.deadLetterRateCriticalPct, 
    label: 'Dead-letter rate', 
    runs: input.terminalRuns24h, 
    min: thresholds.minTerminalSamples, 
    greaterIsWorse: true 
  });
  add('deadLetterRate24h', dead.level, dead.message);

  const brain = getRateIndicator(input.brainErrorRate24h, { warn: thresholds.brainErrorRateWarningPct, crit: thresholds.brainErrorRateCriticalPct, label: 'Brain error', runs: input.brainTotalReports24h, min: thresholds.minBrainSamples, greaterIsWorse: true });
  add('brainErrorRate24h', brain.level, brain.message);

  return {
    overall: maxSloLevel(breaches.map((b) => b.level)),
    evaluatedAt: new Date().toISOString(),
    thresholds,
    indicators: {
      workerHealth: { level: health.level, running: input.queueRunning, healthy: input.queueHealthy, message: health.message },
      queueLag: { level: lag.level, valueMs: input.queueLagMs, message: lag.message },
      successRate24h: { level: success.level, valuePct: success.rate, sampleSize: success.runs, message: success.message },
      deadLetterRate24h: { level: dead.level, valuePct: dead.rate, sampleSize: dead.runs, message: dead.message },
      brainErrorRate24h: { 
        level: brain.level, 
        valuePct: brain.rate, 
        sampleSize: brain.runs, 
        message: brain.message 
      },
    },
    breachCount: breaches.length,
    breaches,
  };
};
