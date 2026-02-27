'use client';

import React from 'react';
import { Button, SelectSimple } from '@/shared/ui';
import type { RegexConfig } from '@/shared/lib/ai-paths';

export type RegexAiProposalSectionProps = {
  regexConfig: RegexConfig;
  hasAiProposal: boolean;
  activeVariant: 'manual' | 'ai';
  onApplyVariant: (variant: 'manual' | 'ai') => void;
  aiProposals: Array<{ pattern: string; flags?: string; groupBy?: string; createdAt: string }>;
  onUseProposal: (proposal: { pattern: string; flags?: string; groupBy?: string }) => void;
  normalizedFlags: string;
};

export function RegexAiProposalSection({
  regexConfig: _regexConfig,
  hasAiProposal,
  activeVariant,
  onApplyVariant,
  aiProposals,
  onUseProposal,
  normalizedFlags,
}: RegexAiProposalSectionProps): React.JSX.Element | null {
  if (!hasAiProposal && aiProposals.length === 0) return null;

  return (
    <div className='space-y-3'>
      {hasAiProposal && (
        <div className='mt-2 flex items-center gap-2'>
          <SelectSimple size='sm'
            value={activeVariant}
            onValueChange={(value: string): void => {
              if (value === 'ai' || value === 'manual') {
                onApplyVariant(value);
              }
            }}
            placeholder='Select variant'
            triggerClassName='h-8 w-[180px] border-border bg-card/70 text-xs text-white'
            contentClassName='border-border bg-gray-900'
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'ai', label: 'AI Proposal' },
            ]}
          />
          <div className='text-[11px] text-gray-500'>
            Switch between manual and AI proposal.
          </div>
        </div>
      )}

      {aiProposals.length > 0 && (
        <div className='mt-3 rounded-md border border-border bg-card/50 p-2'>
          <div className='mb-2 text-[11px] text-gray-300'>AI Proposal History</div>
          <div className='space-y-2'>
            {aiProposals.map((proposal, index: number) => (
              <div key={`${proposal.pattern}-${proposal.createdAt}-${index}`} className='rounded border border-border/60 bg-card/60 p-2'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='text-[11px] text-gray-200 truncate'>{proposal.pattern}</div>
                  <Button
                    type='button'
                    className='h-6 rounded-md border border-emerald-700 bg-emerald-500/10 px-2 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
                    onClick={() => onUseProposal(proposal)}
                  >
                    Use
                  </Button>
                </div>
                <div className='mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400'>
                  <span>flags: {proposal.flags ?? normalizedFlags}</span>
                  <span>groupBy: {proposal.groupBy ?? 'match'}</span>
                  <span>{new Date(proposal.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
