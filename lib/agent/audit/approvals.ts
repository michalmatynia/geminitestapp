export type ApprovalRequest = {
  runId: string;
  toolName: string;
  reason: string;
};

export function requiresApproval(_request: ApprovalRequest) {
  return true;
}
