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

export const assessRuntimeKernelParityRisk = (
  summary: AiPathRuntimeAnalyticsSummary
): RuntimeKernelParityAssessment => {
  const kernelParity = summary.traces.kernelParity;
  const sampledRuns = kernelParity.sampledRuns;
  const runsWithKernelParity = kernelParity.runsWithKernelParity;
  const sampledHistoryEntries = kernelParity.sampledHistoryEntries;
  const strategyCounts = kernelParity.strategyCounts;
  const resolutionSourceCounts = kernelParity.resolutionSourceCounts;
  const resolutionSourceTotal =
    resolutionSourceCounts.override +
    resolutionSourceCounts.registry +
    resolutionSourceCounts.missing +
    resolutionSourceCounts.unknown;

  const coverageRate = safeRate(runsWithKernelParity, sampledRuns);
  const v3Rate = safeRate(strategyCounts.code_object_v3, sampledHistoryEntries);
  const compatibilityRate = safeRate(strategyCounts.compatibility, sampledHistoryEntries);
  const unknownRate = safeRate(strategyCounts.unknown, sampledHistoryEntries);
  const missingResolutionRate = safeRate(resolutionSourceCounts.missing, resolutionSourceTotal);

  const highRisk =
    sampledRuns <= 0 ||
    sampledHistoryEntries <= 0 ||
    coverageRate < 70 ||
    v3Rate < 60 ||
    unknownRate >= 20 ||
    missingResolutionRate >= 20;

  const mediumRisk =
    !highRisk && (coverageRate < 90 || v3Rate < 85 || unknownRate > 0 || missingResolutionRate > 0);

  const riskLevel: RuntimeKernelParityRiskLevel = highRisk ? 'high' : mediumRisk ? 'medium' : 'low';

  const signals: string[] = [];
  if (sampledRuns <= 0) {
    signals.push('no sampled runs in selected window');
  } else if (coverageRate < 90) {
    signals.push(`kernel parity telemetry coverage ${formatPercent(coverageRate)}`);
  }
  if (sampledHistoryEntries <= 0) {
    signals.push('no sampled runtime history entries');
  } else {
    if (v3Rate < 85) {
      signals.push(`code_object_v3 share ${formatPercent(v3Rate)}`);
    }
    if (unknownRate > 0) {
      signals.push(`unknown strategy share ${formatPercent(unknownRate)}`);
    }
  }
  if (missingResolutionRate > 0) {
    signals.push(`missing resolution source rate ${formatPercent(missingResolutionRate)}`);
  }
  if (signals.length === 0) {
    signals.push('coverage and v3 share are within rollout guardrails');
  }

  return {
    riskLevel,
    coverageRate,
    v3Rate,
    compatibilityRate,
    unknownRate,
    missingResolutionRate,
    signals,
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
