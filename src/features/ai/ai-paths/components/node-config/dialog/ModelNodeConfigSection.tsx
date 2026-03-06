'use client';

import { useEffect, useMemo } from 'react';

import type { AiNode, Edge, ModelConfig } from '@/shared/lib/ai-paths';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { Button, Card, FormField, Input, SelectSimple, Textarea } from '@/shared/ui';

import {
  useAiPathGraph,
  useAiPathOrchestrator,
  useAiPathSelection,
} from '../../AiPathConfigContext';

const BRAIN_DEFAULT_MODEL_OPTION_VALUE = '__brain_default_model__';

export function ModelNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { nodes, edges } = useAiPathGraph();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const brainModelOptions = useBrainModelOptions({
    capability: 'ai_paths.model',
    enabled: selectedNode?.type === 'model',
  });

  const modelConfig: ModelConfig = useMemo(
    () =>
      selectedNode?.config?.model ?? {
        modelId: '',
        temperature: 0.7,
        maxTokens: 800,
        vision: selectedNode?.inputs.includes('images') ?? false,
      },
    [selectedNode?.config?.model, selectedNode?.inputs]
  );

  const isModelNode = selectedNode?.type === 'model';

  useEffect((): void => {
    if (!isModelNode) return;
    brainModelOptions.refresh();
  }, [brainModelOptions.refresh, isModelNode, selectedNode?.id]);

  if (!isModelNode) return null;

  const effectiveModelId = brainModelOptions.effectiveModelId.trim();
  const selectedModelId = modelConfig.modelId?.trim() || '';
  const selectedModelValue = selectedModelId || BRAIN_DEFAULT_MODEL_OPTION_VALUE;
  const routingMisconfigured =
    !brainModelOptions.assignment.enabled ||
    brainModelOptions.assignment.provider !== 'model' ||
    (!selectedModelId && !effectiveModelId);
  const knownModels = brainModelOptions.models;
  const selectedModelMissingFromCatalog =
    Boolean(selectedModelId) &&
    !knownModels.some((modelId: string): boolean => modelId === selectedModelId);
  const modelOptions = [
    {
      value: BRAIN_DEFAULT_MODEL_OPTION_VALUE,
      label: `Use Brain default (${effectiveModelId || 'Not configured'})`,
    },
    ...knownModels.map((modelId: string) => ({
      value: modelId,
      label: modelId,
    })),
    ...(selectedModelMissingFromCatalog
      ? [
        {
          value: selectedModelId,
          label: `${selectedModelId} (not currently in Brain catalog)`,
        },
      ]
      : []),
  ];
  const hasPollConsumer = edges.some((edge: Edge): boolean => {
    if (edge.from !== selectedNode.id) return false;
    if (edge.fromPort !== 'jobId') return false;
    const targetNode = nodes.find((node: AiNode): boolean => node.id === edge.to);
    return targetNode?.type === 'poll';
  });
  const updateModelConfig = (patch: Partial<ModelConfig>): void =>
    updateSelectedNodeConfig({
      model: {
        ...modelConfig,
        ...patch,
      },
    });
  const updateTemperature = (rawValue: string): void => {
    const nextValue = Number.parseFloat(rawValue);
    updateModelConfig({
      temperature: Number.isFinite(nextValue) ? nextValue : 0.7,
    });
  };
  const updateMaxTokens = (rawValue: string): void => {
    const nextValue = Number.parseInt(rawValue, 10);
    updateModelConfig({
      maxTokens: Number.isFinite(nextValue) ? Math.max(1, nextValue) : 800,
    });
  };

  return (
    <div className='space-y-4'>
      <FormField
        label='Model'
        description='Brain provides the model catalog and execution engine. This node chooses its runtime model and AI parameters.'
        actions={
          <Button
            type='button'
            variant='outline'
            size='xs'
            onClick={(): void => {
              brainModelOptions.refresh();
            }}
            disabled={brainModelOptions.isLoading}
          >
            Refresh
          </Button>
        }
      >
        <SelectSimple
          size='sm'
          variant='subtle'
          value={selectedModelValue}
          onValueChange={(value: string): void => {
            updateModelConfig({
              modelId: value === BRAIN_DEFAULT_MODEL_OPTION_VALUE ? '' : value.trim(),
            });
          }}
          options={modelOptions}
          placeholder='Select a model'
          disabled={brainModelOptions.isLoading}
        />
      </FormField>
      <FormField label='System Prompt'>
        <Textarea
          className='min-h-[80px] resize-y text-xs'
          value={modelConfig.systemPrompt ?? ''}
          placeholder='Leave blank to inherit the AI Brain default system prompt.'
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateModelConfig({ systemPrompt: event.target.value })
          }
        />
        <p className='text-[11px] text-gray-500 mt-1'>
          A non-empty node prompt overrides AI Brain. Leave blank to inherit the AI Paths default.
        </p>
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Temperature'>
          <Input
            type='number'
            min='0'
            max='2'
            step='0.1'
            variant='subtle'
            size='sm'
            value={modelConfig.temperature}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updateTemperature(event.target.value)
            }
          />
        </FormField>
        <FormField label='Max Tokens'>
          <Input
            type='number'
            min='1'
            step='1'
            variant='subtle'
            size='sm'
            value={modelConfig.maxTokens}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updateMaxTokens(event.target.value)
            }
          />
        </FormField>
      </div>
      {routingMisconfigured ? (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          AI Brain routing for <code>ai_paths</code> is not ready. Enable the feature, keep provider
          set to Model, and set a default model ID in AI Brain.
        </Card>
      ) : null}
      {selectedModelId ? (
        <Card variant='subtle-compact' padding='sm' className='text-[11px] text-gray-300'>
          This node will run with <span className='text-gray-100'>{selectedModelId}</span>. If
          cleared, it will inherit{' '}
          <span className='text-gray-100'>{effectiveModelId || 'the AI Brain default'}</span>.
        </Card>
      ) : (
        <Card variant='subtle-compact' padding='sm' className='text-[11px] text-gray-300'>
          This node inherits the AI Brain default model:{' '}
          <span className='text-gray-100'>{effectiveModelId || 'Not configured'}</span>.
        </Card>
      )}
      {selectedModelMissingFromCatalog ? (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          The selected model is not currently in the AI Brain catalog. It will still run if the
          provider accepts it, but reselecting from the Brain catalog is recommended.
        </Card>
      ) : null}
      {brainModelOptions.sourceWarnings.length > 0 ? (
        <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
          {brainModelOptions.sourceWarnings[0]}
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
          onClick={(): void => updateModelConfig({ vision: !modelConfig.vision })}
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
            updateModelConfig({
              waitForResult: modelConfig.waitForResult === false,
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
