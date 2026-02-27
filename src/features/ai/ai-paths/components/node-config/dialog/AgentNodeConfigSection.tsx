'use client';

import Link from 'next/link';

import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';
import type { AgentConfig } from '@/shared/lib/ai-paths';
import {
  Button,
  
  SelectSimple,
  Textarea,
  LoadingState,
  FormField,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  personaId: '',
  promptTemplate: '',
  waitForResult: true,
};

const RUNTIME_PERSONA_VALUE = '__runtime__';

export function AgentNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  const personasQuery = useAgentPersonas();

  if (selectedNode?.type !== 'agent') return null;

  const personas = personasQuery.data ?? [];
  const agentConfig = selectedNode.config?.agent ?? DEFAULT_AGENT_CONFIG;
  const selectedPersona =
    agentConfig.personaId
      ? personas.find((persona: { id: string }) => persona.id === agentConfig.personaId)
      : null;

  const personaOptions = [
    { value: RUNTIME_PERSONA_VALUE, label: 'Default (runtime settings)' },
    ...personas.map((persona: { id: string; name: string }) => ({
      value: persona.id,
      label: persona.name,
    })),
  ];

  return (
    <div className='space-y-4'>
      <FormField 
        label='Agent Persona' 
        description='Choose a persona to apply the multi-step model settings.'
        actions={
          <Button
            asChild
            variant='outline'
            size='xs'
            className='h-7'
          >
            <Link href='/admin/agentcreator/personas'>Manage Personas</Link>
          </Button>
        }
      >
        <SelectSimple size='sm'
          variant='subtle'
          value={agentConfig.personaId ? agentConfig.personaId : RUNTIME_PERSONA_VALUE}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              agent: { ...agentConfig, personaId: value === RUNTIME_PERSONA_VALUE ? '' : value },
            })
          }
          options={personaOptions}
          placeholder='Select persona'
        />
      </FormField>
      {personasQuery.isLoading && (
        <LoadingState message='Loading personas...' size='sm' className='py-2' />
      )}
      {personasQuery.error && (
        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          Failed to load personas. Using runtime defaults.
        </div>
      )}
      {selectedPersona?.description && (
        <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-[11px] text-gray-300'>
          {selectedPersona.description}
        </div>
      )}
      <FormField 
        label='Prompt Template' 
        description='Leave empty to use the incoming prompt or value input directly.'
      >
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[120px]'
          value={agentConfig.promptTemplate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              agent: { ...agentConfig, promptTemplate: event.target.value },
            })
          }
          placeholder='Use {{bundle}} or {{context}} placeholders to build the agent prompt.'
        />
      </FormField>
      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Wait for result</span>
        <Button
          type='button'
          variant={agentConfig.waitForResult !== false ? 'success' : 'default'}
          size='xs'
          onClick={(): void =>
            updateSelectedNodeConfig({
              agent: {
                ...agentConfig,
                waitForResult: agentConfig.waitForResult === false,
              },
            })
          }
        >
          {agentConfig.waitForResult === false ? 'Disabled' : 'Enabled'}
        </Button>
      </div>
      <p className='text-[11px] text-gray-500'>
        When enabled, the agent waits for completion and emits a{' '}
        <span className='text-gray-300'>result</span> summary. Disable to emit only{' '}
        <span className='text-gray-300'>jobId</span> and{' '}
        <span className='text-gray-300'>status</span>.
      </p>
    </div>
  );
}
