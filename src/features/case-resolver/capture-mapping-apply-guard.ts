export type CaptureMappingApplyGuardReason =
  | 'modal_closed'
  | 'dismissed'
  | 'missing_draft'
  | 'in_flight';

export const resolveCaptureMappingApplyGuardReason = (input: {
  modalOpen: boolean;
  dismissed: boolean;
  hasDraft: boolean;
  inFlight: boolean;
}): CaptureMappingApplyGuardReason | null => {
  if (!input.modalOpen) return 'modal_closed';
  if (input.dismissed) return 'dismissed';
  if (!input.hasDraft) return 'missing_draft';
  if (input.inFlight) return 'in_flight';
  return null;
};
