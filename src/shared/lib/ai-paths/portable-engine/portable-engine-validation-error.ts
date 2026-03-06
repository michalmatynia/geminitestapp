import type { PortablePathValidationReport } from './portable-engine-types';

const formatValidationErrorMessage = (validation: PortablePathValidationReport): string => {
  if (validation.identityIssues.length > 0) {
    return `Portable path identity validation failed: ${validation.identityIssues[0]?.message ?? 'invalid identities'}`;
  }

  const firstCompileError = validation.compileReport.findings.find(
    (finding): boolean => finding.severity === 'error'
  );
  if (firstCompileError) {
    return `Portable path compile validation failed: ${firstCompileError.message}`;
  }

  if (validation.preflightReport?.shouldBlock) {
    return (
      validation.preflightReport.blockMessage ??
      `Portable path strict preflight failed (${validation.preflightReport.blockReason ?? 'unknown'}).`
    );
  }

  return 'Portable path validation failed.';
};

export class PortablePathValidationError extends Error {
  readonly report: PortablePathValidationReport;

  constructor(report: PortablePathValidationReport) {
    super(formatValidationErrorMessage(report));
    this.name = 'PortablePathValidationError';
    this.report = report;
  }
}
