import { truncateWeeklyCheckOutput } from './weekly-report-checks.mjs';
import { getCanonicalTestingSuiteMetadata } from '../../testing/config/test-suite-registry.mjs';

export const toSummaryJsonCheckResult = (check, { maxOutputBytes = 4_000 } = {}) => {
  const canonicalTestingSuite = getCanonicalTestingSuiteMetadata(check.id);

  return {
    id: check.id,
    label: check.label,
    command: check.command,
    status: check.status,
    exitCode: check.exitCode,
    signal: check.signal,
    durationMs: check.durationMs,
    canonicalTestingSuite,
    scanSummary: check.scanSummary ?? null,
    outputPreview: check.output ? truncateWeeklyCheckOutput(check.output, maxOutputBytes) : '',
  };
};

export const buildWeeklyReportSummaryJsonDetails = (
  report,
  { maxOutputBytes = 4_000 } = {}
) => ({
  includeE2E: report.includeE2E,
  strictMode: report.strictMode,
  checkSelection: report.checkSelection ?? null,
  passRates: report.passRates,
  durationAlerts: report.durationAlerts,
  checks: report.checks.map((check) =>
    toSummaryJsonCheckResult(check, {
      maxOutputBytes,
    })
  ),
  buildPreflight: report.buildPreflight,
  metrics: report.metrics,
  metricsError: report.metricsError,
  propDrilling: report.propDrilling,
  uiConsolidation: report.uiConsolidation,
  stabilization: report.stabilization,
  stabilizationError: report.stabilizationError,
  trends: report.trends,
  kangurAiTutorBridge: report.kangurAiTutorBridge ?? null,
  kangurKnowledgeGraphStatus: report.kangurKnowledgeGraphStatus ?? null,
  criticalFlows: report.criticalFlows,
});
