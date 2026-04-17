'use client';

import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import type { PlaywrightFlow, PlaywrightWebsite } from '@/shared/contracts/playwright-steps';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives.public';

type Props = {
  websites: PlaywrightWebsite[];
  flows: PlaywrightFlow[];
  personas: PlaywrightPersona[];
  websiteId: string | null;
  flowId: string | null;
  personaId: string | null;
  onWebsiteChange: (websiteId: string | null) => void;
  onFlowChange: (flowId: string | null) => void;
  onPersonaChange: (personaId: string | null) => void;
};

function LiveScripterScopeSelect({
  id,
  label,
  value,
  placeholder,
  emptyValue,
  emptyLabel,
  options,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  emptyValue: string;
  emptyLabel: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function LiveScripterScopeControls({
  websites,
  flows,
  personas,
  websiteId,
  flowId,
  personaId,
  onWebsiteChange,
  onFlowChange,
  onPersonaChange,
}: Props): React.JSX.Element {
  return (
    <div className='grid gap-3 rounded-lg border border-white/10 bg-black/10 p-4 md:grid-cols-3'>
      <LiveScripterScopeSelect
        id='live-scripter-website'
        label='Website'
        value={websiteId ?? '__shared__'}
        placeholder='Choose website scope'
        emptyValue='__shared__'
        emptyLabel='Shared'
        options={websites.map((website) => ({ value: website.id, label: website.name }))}
        onValueChange={(value) => onWebsiteChange(value === '__shared__' ? null : value)}
      />
      <LiveScripterScopeSelect
        id='live-scripter-flow'
        label='Flow'
        value={flowId ?? '__none__'}
        placeholder='Choose flow scope'
        emptyValue='__none__'
        emptyLabel='No flow'
        options={flows.map((flow) => ({ value: flow.id, label: flow.name }))}
        onValueChange={(value) => onFlowChange(value === '__none__' ? null : value)}
      />
      <LiveScripterScopeSelect
        id='live-scripter-persona'
        label='Persona'
        value={personaId ?? '__none__'}
        placeholder='Choose session persona'
        emptyValue='__none__'
        emptyLabel='Default'
        options={personas.map((persona) => ({ value: persona.id, label: persona.name }))}
        onValueChange={(value) => onPersonaChange(value === '__none__' ? null : value)}
      />
    </div>
  );
}
