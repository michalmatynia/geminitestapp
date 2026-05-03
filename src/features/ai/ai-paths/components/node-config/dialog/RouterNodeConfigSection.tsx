'use client';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { RouterConfig } from '@/shared/contracts/ai-paths';
import { Input, Label } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const ROUTER_MATCH_SOURCE_OPTIONS = [
  { value: 'valid', label: 'Validator valid' },
  { value: 'value', label: 'Value input' },
] as const satisfies ReadonlyArray<LabeledOptionDto<RouterConfig['mode']>>;

const ROUTER_MATCH_MODE_OPTIONS = [
  { value: 'truthy', label: 'Truthy' },
  { value: 'falsy', label: 'Falsy' },
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
] as const satisfies ReadonlyArray<LabeledOptionDto<RouterConfig['matchMode']>>;

export function RouterNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'router') return null;

  const routerConfig = selectedNode.config?.router ?? {
    mode: 'valid',
    matchMode: 'truthy',
    compareTo: '',
  };

  const updateConfig = (patch: Partial<RouterConfig>): void => {
    updateSelectedNodeConfig({
      router: {
        ...routerConfig,
        ...patch,
      },
    });
  };

  return (
    <div className='space-y-4'>
      <MatchSourceField
        value={routerConfig.mode}
        onChange={(mode) => updateConfig({ mode })}
      />
      <MatchModeField
        value={routerConfig.matchMode}
        onChange={(matchMode) => updateConfig({ matchMode })}
      />
      <CompareToField
        value={routerConfig.compareTo}
        onChange={(compareTo) => updateConfig({ compareTo })}
      />
    </div>
  );
}

function MatchSourceField({
  value,
  onChange,
}: {
  value: RouterConfig['mode'];
  onChange: (v: RouterConfig['mode']) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className='text-xs text-gray-400'>Match Source</Label>
      <SelectSimple
        size='sm'
        value={value}
        onValueChange={(v): void => onChange(v as RouterConfig['mode'])}
        options={ROUTER_MATCH_SOURCE_OPTIONS}
        placeholder='Select mode'
        triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        ariaLabel='Select mode'
        title='Select mode'
      />
    </div>
  );
}

function MatchModeField({
  value,
  onChange,
}: {
  value: RouterConfig['matchMode'];
  onChange: (v: RouterConfig['matchMode']) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className='text-xs text-gray-400'>Match Mode</Label>
      <SelectSimple
        size='sm'
        value={value}
        onValueChange={(v): void => onChange(v as RouterConfig['matchMode'])}
        options={ROUTER_MATCH_MODE_OPTIONS}
        placeholder='Select match mode'
        triggerClassName='mt-2 w-full border-border bg-card/70 text-sm text-white'
        ariaLabel='Select match mode'
        title='Select match mode'
      />
    </div>
  );
}

function CompareToField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <Label className='text-xs text-gray-400'>Compare To</Label>
      <Input
        className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        aria-label='Input field'
        title='Input field'
      />
    </div>
  );
}
