import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PromptExploderCaptureMappingModal } from '@/features/case-resolver/components/PromptExploderCaptureMappingModal';
import type { CaseResolverCaptureProposalState } from '@/features/case-resolver-capture/proposals';

const buildProposalDraft = (): CaseResolverCaptureProposalState =>
  ({
    targetFileId: 'file-1',
    addresser: {
      role: 'addresser',
      sourceRole: 'addresser',
      candidate: {
        role: 'addresser',
        displayName: 'Jan Kowalski',
        rawText: 'Jan Kowalski',
        kind: 'person',
      },
      existingReference: null,
      existingAddressId: null,
      matchKind: 'none',
      hasAddressCandidate: false,
      action: 'keepText',
    },
    addressee: null,
    documentDate: null,
  }) as CaseResolverCaptureProposalState;

describe('PromptExploderCaptureMappingModal', () => {
  it('dismisses without triggering apply', () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <PromptExploderCaptureMappingModal
        open
        draft={buildProposalDraft()}
        applying={false}
        targetFileName='Test File'
        partyOptions={[{ value: 'none', label: 'None' }]}
        onClose={onClose}
        onApply={onApply}
        onUpdateAction={vi.fn()}
        onUpdateReference={vi.fn()}
        onUpdateDateAction={vi.fn()}
        resolveMatchedPartyLabel={(): string => 'None'}
        diagnostics={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss (No Mapping)' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies only when apply button is clicked', () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <PromptExploderCaptureMappingModal
        open
        draft={buildProposalDraft()}
        applying={false}
        targetFileName='Test File'
        partyOptions={[{ value: 'none', label: 'None' }]}
        onClose={onClose}
        onApply={onApply}
        onUpdateAction={vi.fn()}
        onUpdateReference={vi.fn()}
        onUpdateDateAction={vi.fn()}
        resolveMatchedPartyLabel={(): string => 'None'}
        diagnostics={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply Mapping' }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
