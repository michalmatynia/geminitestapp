'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { AiNode, Edge, ModelConfig } from '@/features/ai/ai-paths/lib';
import { DEFAULT_MODELS, toNumber } from '@/features/ai/ai-paths/lib';
import { AI_BRAIN_SETTINGS_KEY, parseBrainSettings, resolveBrainAssignment } from '@/features/ai/brain';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Input, Label, SelectSimple, Card, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function ModelNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    edges,
    modelOptions,
    updateSelectedNodeConfig,
  } = useAiPathConfig();
  const settingsStore = useSettingsStore();
  const brainSettingsRaw = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
  const brainSettings = useMemo(
    () => parseBrainSettings(brainSettingsRaw),
    [brainSettingsRaw]
  );
  const brainAssignment = useMemo(
    () => resolveBrainAssignment(brainSettings, 'ai_paths'),
    [brainSettings]
  );
  const brainAppliedRef = useRef<string | null>(null);

  const modelConfig: ModelConfig = useMemo(
    () =>
      selectedNode?.config?.model ?? {
        modelId: DEFAULT_MODELS[0] ?? 'gpt-4o',
        temperature: 0.7,
        maxTokens: 800,
        vision: selectedNode?.inputs.includes('images') ?? false,
      },
    [selectedNode?.config?.model, selectedNode?.inputs]
  );

  const settingsReady = !settingsStore.isLoading && !settingsStore.error;

  useEffect(() => {
    if (!settingsReady) return;
    if (!selectedNode) return;
    if (selectedNode.type !== 'model') return;
    if (!brainAssignment.enabled || brainAssignment.provider !== 'model') return;
    if (!brainAssignment.modelId) return;
    if (brainAppliedRef.current === selectedNode.id) return;
    if (modelConfig.modelId && modelConfig.modelId !== DEFAULT_MODELS[0]) return;
    brainAppliedRef.current = selectedNode.id;
    updateSelectedNodeConfig({
      model: {
        ...modelConfig,
        modelId: brainAssignment.modelId,
        temperature: brainAssignment.temperature ?? modelConfig.temperature,
        maxTokens: brainAssignment.maxTokens ?? modelConfig.maxTokens,
      },
    });
  }, [
    brainAssignment.enabled,
    brainAssignment.maxTokens,
    brainAssignment.modelId,
    brainAssignment.provider,
    brainAssignment.temperature,
    modelConfig,
    selectedNode?.id,
    selectedNode?.type,
    settingsReady,
    updateSelectedNodeConfig,
  ]);

  if (selectedNode?.type !== 'model') return null;

  const mergedModelOptions =
    modelConfig.modelId && !modelOptions.includes(modelConfig.modelId)
      ? [modelConfig.modelId, ...modelOptions]
      : modelOptions;
  const hasPollConsumer = edges.some((edge: Edge): boolean => {
    if (edge.from !== selectedNode.id) return false;
    if (edge.fromPort !== 'jobId') return false;
    const targetNode = nodes.find((node: AiNode): boolean => node.id === edge.to);
    return targetNode?.type === 'poll';
  });

  return (
    <div className='space-y-4'>
      <FormField label='Model'>
        <SelectSimple size='sm'
          value={modelConfig.modelId}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              model: { ...modelConfig, modelId: value },
            })
          }
          options={mergedModelOptions.map((model: string) => ({ value: model, label: model }))}
          placeholder='Select model'
          variant='subtle'
        />
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Temperature'>
          <Input
            type='number'
            step='0.1'
            variant='subtle'
            size='sm'
            value={modelConfig.temperature}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updateSelectedNodeConfig({
                model: {
                  ...modelConfig,
                  temperature: toNumber(
                    event.target.value,
                    modelConfig.temperature
                  ),
                },
              })
            }
          />
        </FormField>
        <FormField label='Max Tokens'>
          <Input
            type='number'
            step='50'
            variant='subtle'
            size='sm'
            value={modelConfig.maxTokens}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
              updateSelectedNodeConfig({
                model: {
                  ...modelConfig,
                  maxTokens: toNumber(
                    event.target.value,
                    modelConfig.maxTokens
                  ),
                },
              })
            }
          />
        </FormField>
      </div>
      <Card variant='subtle-compact' padding='sm' className='flex items-center justify-between border-border/60 bg-card/30 text-xs text-gray-300'>
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
      <Card variant='subtle-compact' padding='sm' className='flex items-center justify-between border-border/60 bg-card/30 text-xs text-gray-300'>
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
