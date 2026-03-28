'use client';

import React from 'react';
import { FormField, FormSection, Input, MultiSelect, SelectSimple, Textarea } from '@/shared/ui';
import {
  PARTY_KIND_OPTIONS as FILEMAKER_PARTY_KIND_OPTIONS,
  formatCommaSeparatedValues as filemakerFormatCommaSeparatedValues,
  parseCommaSeparatedValues as filemakerParseCommaSeparatedValues,
} from '../AdminFilemakerCampaignEditPage.utils';
import type { FilemakerPartyKind, FilemakerPartyReference } from '../types';

interface AudienceSourceSectionProps {
  partyKind: FilemakerPartyKind;
  setPartyKind: (val: FilemakerPartyKind) => void;
  manualPartyIds: string[];
  setManualPartyIds: (val: string[]) => void;
  manualPartyReferences: FilemakerPartyReference[];
  setManualPartyReferences: (val: FilemakerPartyReference[]) => void;
}

export const AudienceSourceSection = ({
  partyKind,
  setPartyKind,
  manualPartyIds,
  setManualPartyIds,
  manualPartyReferences,
  setManualPartyReferences,
}: AudienceSourceSectionProps) => (
  <FormSection title='Audience & Source' className='space-y-4 p-4'>
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField label='Recipient Kind'>
        <SelectSimple
          value={partyKind}
          onChange={(val) => setPartyKind(val as any)}
          options={FILEMAKER_PARTY_KIND_OPTIONS}
        />
      </FormField>
      <FormField label='Manual Party IDs (Comma separated)'>
        <Input
          placeholder='e.g. 123, 456, 789'
          value={filemakerFormatCommaSeparatedValues(manualPartyIds)}
          onChange={(e) => setManualPartyIds(filemakerParseCommaSeparatedValues(e.target.value))}
        />
      </FormField>
    </div>
    <div className='space-y-2'>
      <div className='text-xs font-semibold text-gray-400'>Manual Party References</div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-500'>
        {manualPartyReferences.length === 0 ? (
          'No manual references added. Use the IDs field above for simple targeting.'
        ) : (
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
            {manualPartyReferences.map((ref) => (
              <div key={`${ref.kind}-${ref.id}`} className='rounded border border-border/40 p-2'>
                <span className='font-medium text-white'>{ref.id}</span> ({ref.kind})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </FormSection>
);
