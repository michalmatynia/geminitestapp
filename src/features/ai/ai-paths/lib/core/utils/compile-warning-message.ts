import type { GraphCompileCode, GraphCompileFinding } from './graph';

type WarningFinding = Pick<
  GraphCompileFinding,
  'severity' | 'message' | 'code' | 'metadata'
>;

type CompileWarningReport = {
  warnings: number;
  findings: WarningFinding[];
};

const MAX_CYCLE_LABELS = 4;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const readCycleLabels = (
  metadata: Record<string, unknown> | undefined
): string[] => {
  if (!metadata) return [];
  const labelsRaw = metadata['nodeLabels'];
  if (!Array.isArray(labelsRaw)) return [];
  return labelsRaw
    .filter((item: unknown): item is string => isNonEmptyString(item))
    .map((item: string) => item.trim());
};

const appendCycleDetails = (
  message: string,
  metadata: Record<string, unknown> | undefined
): string => {
  const labels = readCycleLabels(metadata);
  if (labels.length === 0 || /Affected nodes:/i.test(message)) return message;
  const summary =
    labels.length <= MAX_CYCLE_LABELS
      ? labels.join(', ')
      : `${labels.slice(0, MAX_CYCLE_LABELS).join(', ')}, +${labels.length - MAX_CYCLE_LABELS} more`;
  return `${message} Affected nodes: ${summary}.`;
};

const appendInspectorHint = (message: string): string => {
  if (/Compile Inspector/i.test(message)) return message;
  if (/\bFix:/i.test(message)) return message;
  return `${message} Open Paths Settings -> Compile Inspector for details.`;
};

const withActionableContext = (finding: WarningFinding): string | null => {
  const message = finding.message?.trim();
  if (!message) return null;
  const code = finding.code as GraphCompileCode | undefined;
  if (code === 'cycle_detected') {
    const withCycleDetails = appendCycleDetails(message, finding.metadata);
    if (/Compile Inspector/i.test(withCycleDetails)) return withCycleDetails;
    return `${withCycleDetails} Open Paths Settings -> Compile Inspector to inspect loop edges.`;
  }
  if (code === 'model_prompt_deadlock_risk') {
    if (/Compile Inspector/i.test(message)) return message;
    return `${message} Open Paths Settings -> Compile Inspector to inspect prompt loop dependencies and wait-for-input contracts.`;
  }
  return appendInspectorHint(message);
};

export const buildCompileWarningMessage = (
  compileReport: CompileWarningReport
): string => {
  const warningFindings = compileReport.findings.filter(
    (finding: WarningFinding): boolean => finding.severity === 'warning'
  );
  if (warningFindings.length === 0) {
    return `Graph compile warnings detected (${compileReport.warnings}). Open Paths Settings -> Compile Inspector for details.`;
  }
  const primaryFinding = warningFindings[0];
  const primaryMessage = primaryFinding
    ? withActionableContext(primaryFinding)
    : null;
  if (!primaryMessage) {
    return `Graph compile warnings detected (${compileReport.warnings}). Open Paths Settings -> Compile Inspector for details.`;
  }
  const warningCode = primaryFinding?.code ?? 'warning';
  const moreCount = Math.max(0, warningFindings.length - 1);
  return moreCount > 0
    ? `Graph compile warning (${warningCode}): ${primaryMessage} (+${moreCount} more).`
    : `Graph compile warning (${warningCode}): ${primaryMessage}`;
};
