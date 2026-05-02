
import React from 'react';
import { 
  Label, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/shared/ui/primitives.public';
import { type StepDraft } from './step-form-utils';

interface StepFormScopeProps {
  draft: StepDraft;
  set: <K extends keyof StepDraft>(key: K, value: StepDraft[K]) => void;
  websites: { id: string; name: string }[];
  flows: { id: string; websiteId: string; name: string }[];
}

export function StepFormScope({ draft, set, websites, flows }: StepFormScopeProps): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label>Scope</Label>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='step-shared'
          checked={draft.websiteId === null}
          onCheckedChange={(checked) => {
            if (checked) {
              set('websiteId', null);
              set('flowId', null);
            } else {
              set('websiteId', websites[0]?.id ?? null);
              set('flowId', null);
            }
          }}
        />
        <label htmlFor='step-shared' className='cursor-pointer text-sm'>
          Shared (available to all websites)
        </label>
      </div>

      {draft.websiteId !== null ? (
        <div className='ml-6 space-y-2'>
          <div className='space-y-1'>
            <Label className='text-xs text-muted-foreground'>Website</Label>
            <Select
              value={draft.websiteId ?? ''}
              onValueChange={(v) => {
                set('websiteId', v || null);
                set('flowId', null);
              }}
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue placeholder='Select website…' />
              </SelectTrigger>
              <SelectContent>
                {websites.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.websiteId ? (
            <div className='space-y-1'>
              <Label className='text-xs text-muted-foreground'>Flow (optional)</Label>
              <Select
                value={draft.flowId ?? '__none__'}
                onValueChange={(v) => set('flowId', v === '__none__' ? null : v)}
              >
                <SelectTrigger className='h-8 text-xs'>
                  <SelectValue placeholder='Any flow' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>Any flow</SelectItem>
                  {flows
                    .filter((f) => f.websiteId === draft.websiteId)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
