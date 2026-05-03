import { type EnqueueRunInput } from './types';
import { type AiNode, type PathRunRepositorySelection } from '@/shared/contracts/ai-paths';
import { withRuntimeFingerprintMeta } from '@/features/ai/ai-paths/services/runtime-fingerprint';

const compactPersistedRunMeta = (
  meta: Record<string, unknown>
): Record<string, unknown> => {
  const { preflightRuntimeHints, ...rest } = meta;
  void preflightRuntimeHints;
  return rest;
};

export const buildEnqueueMeta = ({
  input,
  requestId,
  repoSelection,
  policyReport,
  runPreflight,
  strictFlowMode,
}: {
  input: EnqueueRunInput;
  requestId: string | null;
  repoSelection: PathRunRepositorySelection;
  policyReport: { disabledNodeTypes: string[]; violations: unknown[] };
  runPreflight: any; // Using any for now to avoid importing too many types, but should be fixed
  strictFlowMode: boolean;
}) => {
  return withRuntimeFingerprintMeta({
    ...compactPersistedRunMeta(input.meta ?? {}),
    ...(requestId ? { requestId } : {}),
    runRepository: {
      collection: repoSelection.collection,
      provider: repoSelection.provider,
      routeMode: repoSelection.routeMode,
      selectedAt: new Date().toISOString(),
    },
    backoffMs: input.backoffMs ?? undefined,
    backoffMaxMs: input.backoffMaxMs ?? undefined,
    nodePolicy:
      policyReport.disabledNodeTypes.length > 0
        ? {
          disabledNodeTypes: policyReport.disabledNodeTypes,
          blockedCount: policyReport.violations.length,
        }
        : undefined,
    graphCompile: {
      errors: runPreflight.compileReport.errors,
      warnings: runPreflight.compileReport.warnings,
      findings: runPreflight.compileReport.findings,
      compiledAt: new Date().toISOString(),
    },
    runPreflight: {
      strictFlowMode,
      validation: runPreflight.validationReport,
      dependency: runPreflight.dependencyReport
        ? {
          errors: runPreflight.dependencyReport.errors,
          warnings: runPreflight.dependencyReport.warnings,
          strictReady: runPreflight.dependencyReport.strictReady,
        }
        : null,
      dataContract: {
        errors: runPreflight.dataContractReport.errors,
        warnings: runPreflight.dataContractReport.warnings,
        issues: runPreflight.dataContractReport.issues.slice(0, 12),
      },
      warnings: runPreflight.warnings,
    },
  });
};
