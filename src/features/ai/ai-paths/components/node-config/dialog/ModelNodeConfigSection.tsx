'use client';

import { useMemo } from 'react';

import type { AiNode, Edge, ModelConfig } from '@/shared/lib/ai-paths';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { Button, Card, FormField, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function ModelNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, nodes, edges, updateSelectedNodeConfig } = useAiPathConfig();
  const brainAssignment = useBrainAssignment({
    capability: 'ai_paths.model',
  }).assignment;

  const modelConfig: ModelConfig = useMemo(
    () =>
      selectedNode?.config?.model ?? {
        temperature: 0.7,
        maxTokens: 800,
        vision: selectedNode?.inputs.includes('images') ?? false,
      },
    [selectedNode?.config?.model, selectedNode?.inputs]
  );

  if (selectedNode?.type !== 'model') return null;

  const effectiveModelId = brainAssignment.modelId?.trim() || '';
  const effectiveTemperature = brainAssignment.temperature ?? modelConfig.temperature;
  const effectiveMaxTokens = brainAssignment.maxTokens ?? modelConfig.maxTokens;
  const effectiveSystemPrompt = brainAssignment.systemPrompt?.trim() ?? '';
  const routingMisconfigured = !brainAssignment.enabled || brainAssignment.provider !== 'model' || !effectiveModelId;
  const hasPollConsumer = edges.some((edge: Edge): boolean => {
    if (edge.from !== selectedNode.id) return false;
    if (edge.fromPort !== 'jobId') return false;
    const targetNode = nodes.find((node: AiNode): boolean => node.id === edge.to);
    return targetNode?.type === 'poll';
  });

  return (
    <div className='space-y-4'>
      <FormField label='Model (Brain managed)'>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/30 text-xs text-gray-300'
        >
          <div className='font-medium text-gray-100'>{effectiveModelId}</div>
          <div className='mt-1 text-[11px] text-gray-500'>
            AI Brain is authoritative for AI Paths model routing.
          </div>
        </Card>
      </FormField>
      <FormField label='System Prompt (Brain managed)'>
        <Textarea
          className='min-h-[80px] resize-y text-xs'
          value={effectiveSystemPrompt}
          placeholder='Using Brain default system prompt.'
          readOnly
        />
        <p className='text-[11px] text-gray-500 mt-1'>
          Sent from AI Brain. Empty means provider default prompt.
        </p>
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Temperature (Brain managed)'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='border-border/60 bg-card/30 text-xs text-gray-300'
          >
            {effectiveTemperature}
          </Card>
        </FormField>
        <FormField label='Max Tokens (Brain managed)'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='border-border/60 bg-card/30 text-xs text-gray-300'
          >
            {effectiveMaxTokens}
          </Card>
        </FormField>
      </div>
      {routingMisconfigured ? (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          AI Brain routing for <code>ai_paths</code> is not ready. Enable the feature, keep
          provider set to Model, and set a model ID in AI Brain.
        </Card>
      ) : null}
      <Card
        variant='subtle-compact'
        padding='sm'
        className='flex items-center justify-between border-border/60 bg-card/30 text-xs text-gray-300'
      >
        <span>Accepts Images</span>
        <Button
          variant={modelConfig.vision ? 'success' : 'default'}
          size='xs'
          type='button'
          onClick={(): void =>
            updateSelectedNodeConfig({
              model: { ...modelConfig, vision: !modelConfig.vision },
            })
          }
        >
          {modelConfig.vision ? 'Enabled' : 'Disabled'}
        </Button>
      </Card>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='flex items-center justify-between border-border/60 bg-card/30 text-xs text-gray-300'
      >
        <span>Wait for result</span>
        <Button
          variant={modelConfig.waitForResult !== false ? 'success' : 'default'}
          size='xs'
          type='button'
          onClick={(): void =>
            updateSelectedNodeConfig({
              model: {
                ...modelConfig,
                waitForResult: modelConfig.waitForResult === false,
              },
            })
          }
        >
          {modelConfig.waitForResult === false ? 'Disabled' : 'Enabled'}
        </Button>
      </Card>
      {hasPollConsumer && (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          {modelConfig.waitForResult === false
            ? 'Poll is connected to this Model\'s jobId. The Model will emit only jobId, so use Poll.result for your Viewer.'
            : 'Poll is connected to this Model\'s jobId. Wait for result is enabled, so the Model will still emit result; Poll will also fetch the job.'}
        </Card>
      )}
      <p className='text-[11px] text-gray-500'>
        When enabled, the Model node polls the job until completion and emits
        <span className='text-gray-300'> result</span>. Disable to emit only{' '}
        <span className='text-gray-300'>jobId</span> and use a Poll node.
      </p>
    </div>
  );
}
