import { truncateWeeklyCheckOutput } from './weekly-report-checks.mjs';

export const toSummaryJsonCheckResult = (check, { maxOutputBytes = 4_000 } = {}) => ({
  id: check.id,
  label: check.label,
  command: check.command,
  status: check.status,
  exitCode: check.exitCode,
  signal: check.signal,
  durationMs: check.durationMs,
  scanSummary: check.scanSummary ?? null,
  outputPreview: check.output ? truncateWeeklyCheckOutput(check.output, maxOutputBytes) : '',
});

export const buildWeeklyReportSummaryJsonDetails = (
  report,
  { maxOutputBytes = 4_000 } = {}
) => ({
  includeE2E: report.includeE2E,
  strictMode: report.strictMode,
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
  criticalFlows: report.criticalFlows,
});
