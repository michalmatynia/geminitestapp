
import React from 'react';
import { 
  Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, 
  Separator
} from '@/shared/ui/primitives.public';
import { type StepDraft } from './step-form-utils';
import { type PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { PLAYWRIGHT_STEP_TYPE_LABELS } from '@/shared/contracts/playwright-steps';

const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [PlaywrightStepType, string][];

interface StepFormInputsProps {
  draft: StepDraft;
  set: <K extends keyof StepDraft>(key: K, value: StepDraft[K]) => void;
}

export function StepFormInputs({ draft, set }: StepFormInputsProps): React.JSX.Element {
  return (
    <>
      <div className='space-y-1.5'>
        <Label htmlFor='step-name'>Name <span className='text-destructive'>*</span></Label>
        <Input
          id='step-name'
          value={draft.name ?? ''}
          onChange={(e) => set('name', e.target.value)}
          placeholder='e.g. Click Add to Cart'
          required
        />
      </div>

      <div className='space-y-1.5'>
        <Label>Step type</Label>
        <Select
          value={draft.type ?? 'click'}
          onValueChange={(value) => set('type', value as PlaywrightStepType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map(([type, label]) => (
              <SelectItem key={type} value={type}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />
    </>
  );
}
