import React from 'react';

import type { CaseResolverCaptureProposalState } from '@/features/case-resolver-capture/proposals';
import {
  CASE_RESOLVER_CAPTURE_ACTION_OPTIONS,
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import { encodeFilemakerPartyReference } from '@/features/filemaker/settings';
import { AppModal, Button, Label, SelectSimple } from '@/shared/ui';

type PromptExploderCaptureMappingModalProps = {
  open: boolean;
  draft: CaseResolverCaptureProposalState | null;
  applying: boolean;
  targetFileName: string | null;
  partyOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onApply: () => void;
  onUpdateAction: (
    role: 'addresser' | 'addressee',
    action: CaseResolverCaptureAction
  ) => void;
  onUpdateReference: (role: 'addresser' | 'addressee', value: string) => void;
  resolveMatchedPartyLabel: (
    reference: CaseResolverCaptureProposalState['addresser'] extends infer T
      ? T extends { existingReference?: infer R | null }
        ? R | null | undefined
        : null | undefined
      : null | undefined
  ) => string;
};

export function PromptExploderCaptureMappingModal({
  open,
  draft,
  applying,
  targetFileName,
  partyOptions,
  onClose,
  onApply,
  onUpdateAction,
  onUpdateReference,
  resolveMatchedPartyLabel,
}: PromptExploderCaptureMappingModalProps): React.JSX.Element {
  return (
    <AppModal
      open={open && draft !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title='Prompt Exploder Capture Mapping'
      subtitle='Review and edit addresser/addressee mapping before it updates this document.'
      size='lg'
      bodyClassName='h-auto max-h-[78vh]'
      footer={(
        <>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={applying}
          >
            Close
          </Button>
          <Button
            type='button'
            onClick={onApply}
            disabled={!draft || applying}
          >
            {applying ? 'Applying...' : 'Apply Mapping'}
          </Button>
        </>
      )}
    >
      {draft ? (
        <div className='space-y-4'>
          <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
            Target File: <span className='font-medium text-gray-100'>{targetFileName}</span>
          </div>

          {(['addresser', 'addressee'] as const).map((role) => {
            const proposal = draft[role];
            const roleLabel = role === 'addresser' ? 'Addresser' : 'Addressee';
            if (!proposal) {
              return (
                <div
                  key={role}
                  className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-3 text-sm text-gray-400'
                >
                  No captured {roleLabel.toLowerCase()} candidate in this Prompt Exploder payload.
                </div>
              );
            }

            const matchedPartyLabel = proposal.existingReference
              ? resolveMatchedPartyLabel(proposal.existingReference)
              : 'None';

            return (
              <div key={role} className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-sm font-semibold text-gray-100'>{roleLabel}</div>
                  <div className='text-[11px] text-gray-400'>
                    Source role: {proposal.sourceRole}
                  </div>
                </div>

                <div className='rounded border border-border/60 bg-card/30 p-2'>
                  <div className='text-[11px] uppercase tracking-wide text-gray-500'>
                    Captured Text
                  </div>
                  <div className='mt-1 whitespace-pre-wrap text-xs text-gray-200'>
                    {proposal.candidate.rawText || proposal.candidate.displayName || 'No captured text.'}
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label className='text-xs text-gray-400'>Action</Label>
                    <SelectSimple
                      size='sm'
                      value={proposal.action}
                      onValueChange={(value: string): void => {
                        if (
                          value === 'database' ||
                          value === 'text' ||
                          value === 'ignore'
                        ) {
                          onUpdateAction(role, value);
                        }
                      }}
                      options={CASE_RESOLVER_CAPTURE_ACTION_OPTIONS}
                      triggerClassName='h-9'
                    />
                  </div>

                  {proposal.action === 'database' ? (
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Database Party</Label>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(proposal.existingReference)}
                        onValueChange={(value: string): void => {
                          onUpdateReference(role, value);
                        }}
                        options={partyOptions}
                        triggerClassName='h-9'
                      />
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Matched Party</Label>
                      <div className='h-9 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                        {matchedPartyLabel}
                      </div>
                    </div>
                  )}
                </div>

                {proposal.existingAddressId ? (
                  <div className='text-[11px] text-gray-500'>
                    Matched address ID: {proposal.existingAddressId}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </AppModal>
  );
}
