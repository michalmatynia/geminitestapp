import React from 'react';

import type {
  CaseResolverCaptureDocumentDateAction,
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import { encodeFilemakerPartyReference } from '@/features/filemaker/settings';
import { Badge, Button, FormField, SelectSimple } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

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
  onUpdateDateAction: (action: CaseResolverCaptureDocumentDateAction) => void;
  resolveMatchedPartyLabel: (
    reference: CaseResolverCaptureProposalState['addresser'] extends infer T
      ? T extends { existingReference?: infer R | null }
        ? R | null | undefined
        : null | undefined
      : null | undefined
  ) => string;
  diagnostics: {
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
  } | null;
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
  onUpdateDateAction,
  resolveMatchedPartyLabel,
  diagnostics,
}: PromptExploderCaptureMappingModalProps): React.JSX.Element {
  const resolveActionOptions = (
    proposal: NonNullable<CaseResolverCaptureProposalState['addresser']>
  ): Array<{ value: CaseResolverCaptureAction; label: string }> => {
    if (proposal.matchKind === 'party' || proposal.matchKind === 'party_and_address') {
      return [
        { value: 'useMatched', label: 'Use matched Filemaker record' },
        { value: 'keepText', label: 'Keep as text only' },
        { value: 'ignore', label: 'Ignore this capture' },
      ];
    }
    return [
      { value: 'createInFilemaker', label: 'Add to Filemaker database' },
      { value: 'keepText', label: 'Keep as text only' },
      { value: 'ignore', label: 'Ignore this capture' },
    ];
  };

  const resolveMatchBadgeLabel = (
    proposal: NonNullable<CaseResolverCaptureProposalState['addresser']>
  ): string => {
    if (proposal.matchKind === 'party_and_address') return 'Matched in Filemaker';
    if (proposal.matchKind === 'party') return 'Matched party';
    if (proposal.matchKind === 'address') return 'Matched address only';
    return proposal.hasAddressCandidate ? 'Address found, not matched' : 'No match';
  };

  const dateActionOptions: Array<{
    value: CaseResolverCaptureDocumentDateAction;
    label: string;
  }> = [
    {
      value: 'useDetectedDate',
      label: 'Use detected date and remove it from text',
    },
    {
      value: 'keepText',
      label: 'Keep date in text only',
    },
    {
      value: 'ignore',
      label: 'Ignore date capture',
    },
  ];

  return (
    <DetailModal
      isOpen={open && draft !== null}
      onClose={onClose}
      title='Prompt Exploder Capture Mapping'
      subtitle='Review and edit addresser/addressee mapping before it updates this document.'
      size='lg'
      headerActions={
        <Button
          type='button'
          onClick={onApply}
          disabled={!draft || applying}
          size='sm'
        >
          {applying ? 'Applying...' : 'Apply Mapping'}
        </Button>
      }
    >
      {draft ? (
        <div className='space-y-4'>
          <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
            Target File: <span className='font-medium text-gray-100'>{targetFileName}</span>
          </div>
          {diagnostics ? (
            <div className='rounded border border-border/60 bg-card/20 px-3 py-2 text-[11px] text-gray-300'>
              <div>
                Apply status: <span className='font-medium text-gray-100'>{diagnostics.status}</span>
                {diagnostics.stage ? ` (${diagnostics.stage})` : ''}
              </div>
              <div className='mt-0.5'>
                {diagnostics.message}
              </div>
              <div className='mt-0.5 text-gray-400'>
                target: {diagnostics.targetFileId ?? '(none)'} · resolved: {diagnostics.resolvedTargetFileId ?? '(none)'} · rev: {diagnostics.workspaceRevision} · attempts: {diagnostics.attempts}
              </div>
            </div>
          ) : null}

          {draft.documentDate ? (
            <div className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-sm font-semibold text-gray-100'>Document Date</div>
                  <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
                    Source: {draft.documentDate.source === 'metadata' ? 'Metadata' : 'Text'}
                  </Badge>
                </div>
              </div>
              <div className='rounded border border-border/60 bg-card/30 p-2 text-xs text-gray-200'>
                <div>
                  Detected date: <span className='font-medium'>{draft.documentDate.isoDate}</span>
                </div>
                {draft.documentDate.sourceLine ? (
                  <div className='mt-1 text-[11px] text-gray-400'>
                    Source line: {draft.documentDate.sourceLine}
                  </div>
                ) : null}
              </div>
              <FormField label='Date Action'>
                <SelectSimple
                  size='sm'
                  value={draft.documentDate.action}
                  onValueChange={(value: string): void => {
                    if (value === 'useDetectedDate' || value === 'keepText' || value === 'ignore') {
                      onUpdateDateAction(value);
                    }
                  }}
                  options={dateActionOptions}
                  triggerClassName='h-9'
                />
              </FormField>
            </div>
          ) : (
            <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-3 text-sm text-gray-400'>
              No captured document date in this Prompt Exploder payload.
            </div>
          )}

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
            const actionOptions = resolveActionOptions(proposal);
            const selectedAction = actionOptions.some((option) => option.value === proposal.action)
              ? proposal.action
              : actionOptions[0]?.value ?? 'ignore';
            const shouldShowMatchedPartySelector = selectedAction === 'useMatched';

            return (
              <div key={role} className='space-y-3 rounded border border-border/60 bg-card/25 p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <div className='text-sm font-semibold text-gray-100'>{roleLabel}</div>
                    <Badge variant='outline' className='px-1.5 py-0 text-[10px]'>
                      {resolveMatchBadgeLabel(proposal)}
                    </Badge>
                  </div>
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
                  <FormField label='Action'>
                    <SelectSimple
                      size='sm'
                      value={selectedAction}
                      onValueChange={(value: string): void => {
                        if (
                          value === 'useMatched' ||
                          value === 'createInFilemaker' ||
                          value === 'keepText' ||
                          value === 'ignore'
                        ) {
                          onUpdateAction(role, value);
                        }
                      }}
                      options={actionOptions}
                      triggerClassName='h-9'
                    />
                  </FormField>

                  {shouldShowMatchedPartySelector ? (
                    <FormField label='Database Party'>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(proposal.existingReference)}
                        onValueChange={(value: string): void => {
                          onUpdateReference(role, value);
                        }}
                        options={partyOptions}
                        triggerClassName='h-9'
                      />
                    </FormField>
                  ) : (
                    <FormField label='Matched Party'>
                      <div className='h-9 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-300'>
                        {matchedPartyLabel}
                      </div>
                    </FormField>
                  )}
                </div>

                {proposal.existingAddressId ? (
                  <div className='text-[11px] text-gray-500'>
                    Matched address ID: {proposal.existingAddressId}
                  </div>
                ) : proposal.hasAddressCandidate ? (
                  <div className='text-[11px] text-gray-500'>
                    Address candidate detected (not matched in Filemaker).
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </DetailModal>
  );
}
