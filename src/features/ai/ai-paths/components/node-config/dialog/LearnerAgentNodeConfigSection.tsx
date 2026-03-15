'use client';

import Link from 'next/link';
import React from 'react';

import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries';
import type { AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';
import type { LearnerAgentConfig } from '@/shared/lib/ai-paths';
import { Button, SelectSimple, Textarea, LoadingState, Card, Alert, FormField } from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';

const DEFAULT_CONFIG: LearnerAgentConfig = {
  agentId: '',
  promptTemplate: '',
  includeSources: true,
};

const NO_AGENT_VALUE = '__none__';

export function LearnerAgentNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const agentsQuery = useTeachingAgents();

  if (selectedNode?.type !== 'learner_agent') return null;

  const agents = agentsQuery.data ?? [];
  const learnerConfig = selectedNode.config?.learnerAgent ?? DEFAULT_CONFIG;
  const selectedAgent = learnerConfig.agentId
    ? (agents.find((a: AgentTeachingAgentRecord) => a.id === learnerConfig.agentId) ?? null)
    : null;

  const agentOptions = [
    { value: NO_AGENT_VALUE, label: 'None' },
    ...agents.map((agent: AgentTeachingAgentRecord) => ({
      value: agent.id,
      label: agent.name,
    })),
  ];

  return (
    <div className='space-y-4'>
      <FormField
        label='Learner Agent'
        description='Answer using your embedding school (RAG).'
        actions={
          <Button asChild variant='outline' size='xs' className='h-7'>
            <Link href='/admin/agentcreator/teaching/agents'>Manage Learner Agents</Link>
          </Button>
        }
      >
        <SelectSimple
          size='sm'
          variant='subtle'
          value={learnerConfig.agentId ? learnerConfig.agentId : NO_AGENT_VALUE}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              learnerAgent: {
                ...learnerConfig,
                agentId: value === NO_AGENT_VALUE ? '' : value,
              },
            })
          }
          options={agentOptions}
          placeholder='Select learner agent'
         ariaLabel='Select learner agent' title='Select learner agent'/>
      </FormField>

      {agentsQuery.isLoading && (
        <LoadingState message='Loading learner agents...' size='sm' className='py-2' />
      )}
      {agentsQuery.error && <Alert variant='warning'>Failed to load learner agents.</Alert>}

      {selectedAgent ? (
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border bg-card/60 text-[11px] text-gray-300'
        >
          <div className='text-gray-200'>{selectedAgent.name}</div>
          <div className='mt-1 text-gray-400'>
            LLM: {selectedAgent.llmModel} • Embed: {selectedAgent.embeddingModel} • Collections:{' '}
            {(selectedAgent.collectionIds ?? []).length}
          </div>
        </Card>
      ) : null}

      <FormField
        label='Prompt Template'
        description='Leave empty to use the incoming prompt or value input directly.'
      >
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[120px]'
          value={learnerConfig.promptTemplate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              learnerAgent: {
                ...learnerConfig,
                promptTemplate: event.target.value,
              },
            })
          }
          placeholder='Use {{context}} / {{bundle}} placeholders to build the question.'
         aria-label='Use {{context}} / {{bundle}} placeholders to build the question.' title='Use {{context}} / {{bundle}} placeholders to build the question.'/>
      </FormField>

      <Card
        variant='subtle-compact'
        padding='sm'
        className='flex items-center justify-between border-border bg-card/50 text-xs text-gray-300'
      >
        <span>Include sources</span>
        <Button
          variant={learnerConfig.includeSources ? 'success' : 'default'}
          size='xs'
          type='button'
          onClick={(): void =>
            updateSelectedNodeConfig({
              learnerAgent: {
                ...learnerConfig,
                includeSources: !learnerConfig.includeSources,
              },
            })
          }
        >
          {learnerConfig.includeSources ? 'Enabled' : 'Disabled'}
        </Button>
      </Card>
    </div>
  );
}
