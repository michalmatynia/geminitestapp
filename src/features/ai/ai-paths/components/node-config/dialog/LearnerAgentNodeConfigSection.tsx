'use client';

import Link from 'next/link';
import React from 'react';

import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeaching';
import type { LearnerAgentConfig } from '@/features/ai/ai-paths/lib';
import type { AgentTeachingAgentRecord } from '@/shared/types/domain/agent-teaching';
import {
  Button,
  Label,
  SelectSimple,
  Textarea,
} from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const DEFAULT_CONFIG: LearnerAgentConfig = {
  agentId: '',
  promptTemplate: '',
  includeSources: true,
};

const NO_AGENT_VALUE = '__none__';

export function LearnerAgentNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  const agentsQuery = useTeachingAgents();

  if (!selectedNode || selectedNode.type !== 'learner_agent') return null;

  const agents = agentsQuery.data ?? [];
  const learnerConfig = selectedNode.config?.learnerAgent ?? DEFAULT_CONFIG;
  const selectedAgent =
    learnerConfig.agentId
      ? agents.find((a: AgentTeachingAgentRecord) => a.id === learnerConfig.agentId) ?? null
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
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Learner Agent</Label>
          <div className='text-[11px] text-gray-500'>
            Answer using your embedding school (RAG).
          </div>
        </div>
        <Button
          asChild
          variant='outline'
          size='sm'
          className='border-border text-xs text-gray-200'
        >
          <Link href='/admin/agentcreator/teaching/agents'>Manage Learner Agents</Link>
        </Button>
      </div>

      <SelectSimple size='sm'
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
      />

      {agentsQuery.isLoading && (
        <div className='text-[11px] text-gray-500'>Loading learner agents…</div>
      )}
      {agentsQuery.error && (
        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          Failed to load learner agents.
        </div>
      )}

      {selectedAgent ? (
        <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-[11px] text-gray-300'>
          <div className='text-gray-200'>{selectedAgent.name}</div>
          <div className='mt-1 text-gray-400'>
            LLM: {selectedAgent.llmModel} • Embed: {selectedAgent.embeddingModel} • Collections:{' '}
            {(selectedAgent.collectionIds ?? []).length}
          </div>
        </div>
      ) : null}

      <div>
        <Label className='text-xs text-gray-400'>Prompt Template</Label>
        <Textarea
          className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
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
        />
        <div className='mt-1 text-[11px] text-gray-500'>
          Leave empty to use the incoming <span className='text-gray-300'>prompt</span> or{' '}
          <span className='text-gray-300'>value</span> input directly.
        </div>
      </div>

      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Include sources</span>
        <Button
          type='button'
          className={`rounded border px-3 py-1 text-xs ${
            learnerConfig.includeSources
              ? 'text-emerald-200 hover:bg-emerald-500/10'
              : 'text-gray-300 hover:bg-muted/50'
          }`}
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
      </div>
    </div>
  );
}
