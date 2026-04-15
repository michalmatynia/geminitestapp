import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths';

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const safeRate = (part: number, total: number): number => {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
};

type RuntimeKernelParityRiskLevel = 'low' | 'medium' | 'high';

export type RuntimeKernelParityAssessment = {
  riskLevel: RuntimeKernelParityRiskLevel;
  coverageRate: number;
  v3Rate: number;
  compatibilityRate: number;
  unknownRate: number;
  missingResolutionRate: number;
  signals: string[];
};

type RuntimeKernelParityRates = {
  sampledRuns: number;
  sampledHistoryEntries: number;
  coverageRate: number;
  v3Rate: number;
  compatibilityRate: number;
  unknownRate: number;
  missingResolutionRate: number;
};

const resolveRuntimeKernelParityRates = (
  summary: AiPathRuntimeAnalyticsSummary
): RuntimeKernelParityRates => {
  const kernelParity = summary.traces.kernelParity;
  const sampledRuns = kernelParity.sampledRuns;
  const sampledHistoryEntries = kernelParity.sampledHistoryEntries;
  const resolutionSourceCounts = kernelParity.resolutionSourceCounts;
  const resolutionSourceTotal =
    resolutionSourceCounts.override +
    resolutionSourceCounts.registry +
    resolutionSourceCounts.missing +
    resolutionSourceCounts.unknown;

  return {
    sampledRuns,
    sampledHistoryEntries,
    coverageRate: safeRate(kernelParity.runsWithKernelParity, sampledRuns),
    v3Rate: safeRate(kernelParity.strategyCounts.code_object_v3, sampledHistoryEntries),
    compatibilityRate: safeRate(kernelParity.strategyCounts.compatibility, sampledHistoryEntries),
    unknownRate: safeRate(kernelParity.strategyCounts.unknown, sampledHistoryEntries),
    missingResolutionRate: safeRate(resolutionSourceCounts.missing, resolutionSourceTotal),
  };
};

const resolveRuntimeKernelParityRiskLevel = (
  rates: RuntimeKernelParityRates
): RuntimeKernelParityRiskLevel => {
  const highRiskSignals = [
    rates.sampledRuns <= 0,
    rates.sampledHistoryEntries <= 0,
    rates.coverageRate < 70,
    rates.v3Rate < 60,
    rates.unknownRate >= 20,
    rates.missingResolutionRate >= 20,
  ];
  if (highRiskSignals.some(Boolean)) return 'high';

  const mediumRiskSignals = [
    rates.coverageRate < 90,
    rates.v3Rate < 85,
    rates.unknownRate > 0,
    rates.missingResolutionRate > 0,
  ];
  return mediumRiskSignals.some(Boolean) ? 'medium' : 'low';
};

const buildRuntimeKernelParitySignals = (rates: RuntimeKernelParityRates): string[] => {
  const signals = [
    rates.sampledRuns <= 0
      ? 'no sampled runs in selected window'
      : rates.coverageRate < 90
        ? `kernel parity telemetry coverage ${formatPercent(rates.coverageRate)}`
        : null,
    rates.sampledHistoryEntries <= 0 ? 'no sampled runtime history entries' : null,
    rates.sampledHistoryEntries > 0 && rates.v3Rate < 85
      ? `code_object_v3 share ${formatPercent(rates.v3Rate)}`
      : null,
    rates.sampledHistoryEntries > 0 && rates.unknownRate > 0
      ? `unknown strategy share ${formatPercent(rates.unknownRate)}`
      : null,
    rates.missingResolutionRate > 0
      ? `missing resolution source rate ${formatPercent(rates.missingResolutionRate)}`
      : null,
  ].filter((signal): signal is string => Boolean(signal));

  return signals.length > 0
    ? signals
    : ['coverage and v3 share are within rollout guardrails'];
};

export const assessRuntimeKernelParityRisk = (
  summary: AiPathRuntimeAnalyticsSummary
): RuntimeKernelParityAssessment => {
  const rates = resolveRuntimeKernelParityRates(summary);

  return {
    riskLevel: resolveRuntimeKernelParityRiskLevel(rates),
    coverageRate: rates.coverageRate,
    v3Rate: rates.v3Rate,
    compatibilityRate: rates.compatibilityRate,
    unknownRate: rates.unknownRate,
    missingResolutionRate: rates.missingResolutionRate,
    signals: buildRuntimeKernelParitySignals(rates),
  };
};

export const buildRuntimeKernelParityMetadata = (
  summary: AiPathRuntimeAnalyticsSummary,
  assessment: RuntimeKernelParityAssessment
): Record<string, unknown> => ({
  runtimeAnalyticsRange: summary.range,
  runtimeAnalyticsFrom: summary.from,
  runtimeAnalyticsTo: summary.to,
  runtimeKernelParityRiskLevel: assessment.riskLevel,
  runtimeKernelParityCoverageRate: Number(assessment.coverageRate.toFixed(1)),
  runtimeKernelParityV3Rate: Number(assessment.v3Rate.toFixed(1)),
  runtimeKernelParityCompatibilityRate: Number(assessment.compatibilityRate.toFixed(1)),
  runtimeKernelParityUnknownRate: Number(assessment.unknownRate.toFixed(1)),
  runtimeKernelParityMissingResolutionRate: Number(assessment.missingResolutionRate.toFixed(1)),
  runtimeKernelParitySignals: assessment.signals,
});

export const buildRuntimeKernelParityPrompt = (
  summary: AiPathRuntimeAnalyticsSummary,
  assessment: RuntimeKernelParityAssessment = assessRuntimeKernelParityRisk(summary)
): string => {
  const kernelParity = summary.traces.kernelParity;
  const sampledRuns = kernelParity.sampledRuns;
  const runsWithKernelParity = kernelParity.runsWithKernelParity;
  const sampledHistoryEntries = kernelParity.sampledHistoryEntries;
  const strategyCounts = kernelParity.strategyCounts;
  const resolutionSourceCounts = kernelParity.resolutionSourceCounts;
  const coverageRate = assessment.coverageRate;
  const v3Rate = assessment.v3Rate;
  const compatibilityRate = assessment.compatibilityRate;
  const unknownRate = assessment.unknownRate;
  const codeObjectIds = kernelParity.codeObjectIds.slice(0, 5);

  const lines: string[] = [
    `- Kernel parity migration risk: ${assessment.riskLevel.toUpperCase()} (${assessment.signals.join('; ')})`,
    `- Sampled runs: ${sampledRuns}`,
    `- Runs with kernel parity telemetry: ${runsWithKernelParity} (${formatPercent(coverageRate)})`,
    `- Sampled runtime history entries: ${sampledHistoryEntries}`,
    `- Strategy split: code_object_v3=${strategyCounts.code_object_v3} (${formatPercent(v3Rate)}), compatibility=${strategyCounts.compatibility} (${formatPercent(compatibilityRate)}), unknown=${strategyCounts.unknown} (${formatPercent(unknownRate)})`,
    `- Resolution source counts: override=${resolutionSourceCounts.override}, registry=${resolutionSourceCounts.registry}, missing=${resolutionSourceCounts.missing}, unknown=${resolutionSourceCounts.unknown}`,
  ];

  if (codeObjectIds.length > 0) {
    lines.push(`- Top runtime code objects: ${codeObjectIds.join(', ')}`);
  } else {
    lines.push('- Top runtime code objects: none observed in sampled traces');
  }

  return lines.join('\n');
};
