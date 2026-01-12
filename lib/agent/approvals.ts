export type ApprovalRequest = {
  runId: string;
  toolName: string;
  reason: string;
};

export async function requiresApproval(_request: ApprovalRequest) {
  return true;
}
