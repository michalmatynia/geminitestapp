import { type AiPathRunStatus } from '@/shared/contracts/ai-paths';
import { type NodeDiagnostic } from '@/shared/lib/ai-paths/error-reporting';

export const resolveRunCompletionStatus = (
  runtimeHaltReason: string | null,
  failedNodeDiagnostics: NodeDiagnostic[],
  waitingNodeDiagnostics: NodeDiagnostic[]
): { status: AiPathRunStatus; error: string | null } => {
  let finalStatus: AiPathRunStatus = 'completed';
  let finalError: string | null = null;

  if (runtimeHaltReason === 'failed' || (runtimeHaltReason === 'blocked' && failedNodeDiagnostics.length > 0)) {
    finalStatus = 'failed';
    finalError = 'Run failed due to node execution errors.';
  } else if (runtimeHaltReason === 'max_iterations') {
    finalStatus = 'failed';
    finalError = 'Maximum iteration limit reached.';
  } else if (waitingNodeDiagnostics.length > 0) {
    finalStatus = 'failed';
    finalError = 'Run completed with waiting nodes.';
  } else if (failedNodeDiagnostics.length > 0) {
    finalStatus = 'failed';
    finalError = 'Run completed with failed nodes.';
  }

  return { status: finalStatus, error: finalError };
};
