/**
 * Capture Mapping Apply Guard
 * 
 * Guard logic for determining when capture mapping operations should be blocked.
 * Provides:
 * - Reason-based blocking logic for mapping operations
 * - Modal state validation and control
 * - Draft state checking and validation
 * - In-flight operation detection
 * - User dismissal state tracking
 */

/** Reasons why capture mapping apply operation might be blocked */
export type CaptureMappingApplyGuardReason =
  | 'modal_closed'
  | 'dismissed'
  | 'missing_draft'
  | 'in_flight';

/**
 * Resolves the reason why capture mapping apply should be blocked, if any
 * @param input - Current state of modal, dismissal, draft, and operation status
 * @returns Blocking reason or null if operation should proceed
 */
export const resolveCaptureMappingApplyGuardReason = (input: {
  /** Whether the modal is currently open */
  modalOpen: boolean;
  /** Whether the user has dismissed the operation */
  dismissed: boolean;
  /** Whether there is a draft available to apply */
  hasDraft: boolean;
  /** Whether an operation is currently in progress */
  inFlight: boolean;
}): CaptureMappingApplyGuardReason | null => {
  /** Check blocking conditions in priority order */
  if (!input.modalOpen) return 'modal_closed';
  if (input.dismissed) return 'dismissed';
  if (!input.hasDraft) return 'missing_draft';
  if (input.inFlight) return 'in_flight';
  
  /** No blocking conditions found - operation can proceed */
  return null;
};
