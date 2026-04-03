'use client';

import { FormField, FormSection, Input, SelectSimple } from '@/shared/ui';
import {
  PARTY_KIND_OPTIONS as FILEMAKER_PARTY_KIND_OPTIONS,
  formatCommaSeparatedValues as filemakerFormatCommaSeparatedValues,
  parseCommaSeparatedValues as filemakerParseCommaSeparatedValues,
} from '../AdminFilemakerCampaignEditPage.utils';
import type { FilemakerPartyKind } from '../../types';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';

export const AudienceSourceSection = () => {
  const { draft, setDraft } = useCampaignEditContext();
  
  const setPartyKind = (val: FilemakerPartyKind) => {
    setDraft(prev => ({
      ...prev,
      audience: { ...prev.audience, partyKind: val }
    }));
  };

  const setManualPartyIds = (val: string[]) => {
    setDraft(prev => ({
      ...prev,
      audience: { ...prev.audience, manualPartyIds: val }
    }));
  };

  return (
    <FormSection title='Audience & Source' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Recipient Kind'>
          <SelectSimple
            ariaLabel='Recipient kind'
            value={draft.audience.partyKind}
            onValueChange={(value) => setPartyKind(value as FilemakerPartyKind)}
            options={FILEMAKER_PARTY_KIND_OPTIONS}
          />
        </FormField>
        <FormField label='Manual Party IDs (Comma separated)'>
          <Input
            placeholder='e.g. 123, 456, 789'
            value={filemakerFormatCommaSeparatedValues(draft.audience.manualPartyIds)}
            onChange={(e) => setManualPartyIds(filemakerParseCommaSeparatedValues(e.target.value))}
          />
        </FormField>
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-semibold text-gray-400'>Manual Party References</div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-500'>
          {draft.audience.manualPartyIds.length === 0 ? (
            'No manual references added. Use the IDs field above for simple targeting.'
          ) : (
            <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {draft.audience.manualPartyIds.map((id) => (
                <div key={id} className='rounded border border-border/40 p-2'>
                  <span className='font-medium text-white'>{id}</span> ({draft.audience.partyKind})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
};
