import type { ApprovalRequest } from '@/shared/contracts/agent-runtime';

export function requiresApproval(_request: ApprovalRequest): boolean {
  return true;
}
