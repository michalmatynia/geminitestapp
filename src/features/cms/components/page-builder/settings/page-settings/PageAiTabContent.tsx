'use client';

import React, { useEffect, useMemo } from 'react';
import { Button, Label, Textarea, SelectSimple } from '@/shared/ui';
import { usePageAiAssistant } from './usePageAiAssistant';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries';
import type { AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';

export function PageAiTabContent({
  activeTab,
}: {
  activeTab: string;
}): React.JSX.Element {
  const ai = usePageAiAssistant();
  
  const modelsQuery = useChatbotModels({
    enabled: activeTab === 'ai' && ai.pageAiProvider === 'model',
  });
  const teachingAgentsQuery = useTeachingAgents({
    enabled: activeTab === 'ai' && ai.pageAiProvider === 'agent',
  });

  const modelOptions = useMemo((): string[] => {
    const models = Array.isArray(modelsQuery.data) ? modelsQuery.data : [];
    const fromApi = models
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    return Array.from(new Set(fromApi));
  }, [modelsQuery.data]);

  const agentOptions = useMemo(
    () => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),
    [teachingAgentsQuery.data]
  );

  const pageAiTaskOptions = useMemo(
    () => [
      { label: 'Layout plan', value: 'layout' },
      { label: 'SEO metadata', value: 'seo' },
    ],
    []
  );
  const pageAiProviderOptions = useMemo(
    () => [
      { label: 'AI model', value: 'model' },
      { label: 'Deepthinking agent', value: 'agent' },
    ],
    []
  );

  useEffect((): void => {
    if (ai.pageAiProvider !== 'model') return;
    if (ai.pageAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    ai.setPageAiModelId(modelOptions[0]!);
  }, [ai.pageAiProvider, ai.pageAiModelId, modelOptions]);

  const pageAiPlaceholder = '{{page_context}}\\n{{available_templates}}';

  return (
    <div className='space-y-4'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        AI page assistant
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Task</Label>
        <SelectSimple size='sm'
          value={ai.pageAiTask}
          onValueChange={(value: string): void => ai.setPageAiTask(value as 'layout' | 'seo')}
          options={pageAiTaskOptions}
          placeholder='Select task'
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Provider</Label>
        <SelectSimple size='sm'
          value={ai.pageAiProvider}
          onValueChange={(value: string): void => ai.setPageAiProvider(value as 'model' | 'agent')}
          options={pageAiProviderOptions}
          placeholder='Select provider'
        />
      </div>
      {ai.pageAiProvider !== 'agent' ? (
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Model</Label>
          <SelectSimple size='sm'
            value={ai.pageAiModelId}
            onValueChange={(value: string): void => ai.setPageAiModelId(value)}
            options={modelOptions.map((model: string) => ({ value: model, label: model }))}
            placeholder={modelOptions.length ? 'Select model' : 'No models available'}
          />
        </div>
      ) : (
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Deepthinking agent</Label>
          <SelectSimple size='sm'
            value={ai.pageAiAgentId}
            onValueChange={(value: string): void => ai.setPageAiAgentId(value)}
            options={agentOptions.length ? agentOptions : [{ label: 'No agents configured', value: '' }]}
            placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
          />
        </div>
      )}
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Prompt</Label>
        <Textarea
          value={ai.pageAiPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => ai.setPageAiPrompt(e.target.value)}
          placeholder={`Describe what you need.\n\nContext:\n${pageAiPlaceholder}`}
          className='min-h-[120px] text-xs'
          spellCheck={false}
        />
      </div>
      <div className='flex items-center justify-between'>
        <div className='text-[11px] text-gray-500'>Context placeholders</div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={(): void => {
            const current = ai.pageAiPrompt.trim();
            const nextPrompt = current.length ? `${current}\n\n${pageAiPlaceholder}` : pageAiPlaceholder;
            ai.setPageAiPrompt(nextPrompt);
          }}
        >
          Insert placeholders
        </Button>
      </div>
      <Textarea
        value={pageAiPlaceholder}
        readOnly
        className='min-h-[64px] text-xs font-mono text-gray-300'
      />
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          type='button'
          size='sm'
          onClick={(): void => void ai.handleGeneratePageAi()}
          disabled={ai.generatePageAiMutation.isPending}
        >
          {ai.generatePageAiMutation.isPending ? 'Generating...' : 'Generate'}
        </Button>
        {ai.generatePageAiMutation.isPending && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={ai.handleCancelPageAi}
          >
            Cancel
          </Button>
        )}
      </div>
      {ai.pageAiError && (
        <div className='text-xs text-red-400'>{ai.pageAiError}</div>
      )}
      {ai.pageAiOutput && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>AI output</Label>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={ai.handleApplyPageAi}
            >
              Apply
            </Button>
          </div>
          <Textarea
            value={ai.pageAiOutput}
            readOnly
            className='min-h-[140px] text-xs font-mono text-gray-300'
          />
        </div>
      )}
    </div>
  );
}
