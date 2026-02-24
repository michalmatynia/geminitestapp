'use client';




import React from 'react';

import type { AiNode, Edge, PromptConfig } from '@/features/ai/ai-paths/lib';
import { buildPromptOutput, createParserMappings, formatRuntimeValue } from '@/features/ai/ai-paths/lib';
import { formatPlaceholderLabel, formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Button, Textarea, Alert, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';
import {
  PlaceholderMatrixDialog,
  type PlaceholderGroup,
  type PlaceholderTarget,
} from '../database/PlaceholderMatrixDialog';

export function PromptNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    edges,
    runtimeState,
    updateSelectedNodeConfig,
    onSendToAi,
    sendingToAi,
    toast,
  } = useAiPathConfig();
  const promptTemplateRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [placeholderMatrixOpen, setPlaceholderMatrixOpen] = React.useState<boolean>(false);
  const [placeholderTarget, setPlaceholderTarget] = React.useState<PlaceholderTarget>('prompt');

  const promptConfig: PromptConfig = selectedNode?.config?.prompt ?? {
    template: '',
  };
  const resolvedPrompt = React.useMemo((): string => {
    if (selectedNode?.type !== 'prompt') return '';
    const config = selectedNode.config?.prompt ?? { template: '' };
    const inputs = runtimeState.inputs?.[selectedNode.id] ?? {};
    const { promptOutput } = buildPromptOutput(config, inputs);
    return promptOutput;
  }, [selectedNode?.type, selectedNode?.id, selectedNode?.config?.prompt, runtimeState.inputs]);

  if (selectedNode?.type !== 'prompt') return null;
  const insertPromptPlaceholder = (placeholder: string): void => {
    const currentTemplate = promptConfig.template ?? '';
    const textArea = promptTemplateRef.current;
    const selectionStart =
      typeof textArea?.selectionStart === 'number' ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === 'number' ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const prefix = currentTemplate.slice(0, rangeStart);
    const needsSeparator = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n');
    const separator = needsSeparator ? ' ' : '';
    const nextTemplate = `${prefix}${separator}${placeholder}${currentTemplate.slice(rangeEnd)}`;
    updateSelectedNodeConfig({ prompt: { template: nextTemplate } });

    window.setTimeout(() => {
      const node = promptTemplateRef.current;
      if (!node) return;
      const cursorPosition = rangeStart + separator.length + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };
  const incomingEdges = edges.filter((edge: Edge) => edge.to === selectedNode.id);
  const inputPorts = incomingEdges
    .map((edge: Edge) => edge.toPort)
    .filter((port: string | null | undefined): port is string => Boolean(port));
  const bundleKeys = new Set<string>();
  incomingEdges.forEach((edge: Edge) => {
    if (edge.toPort !== 'bundle') return;
    const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
    if (!fromNode) return;
    if (fromNode.type === 'parser') {
      const mappings =
        fromNode.config?.parser?.mappings ??
        createParserMappings(fromNode.outputs);
      Object.keys(mappings).forEach((key: string) => {
        const trimmed = key.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
      return;
    }
    if (fromNode.type === 'bundle') {
      fromNode.inputs.forEach((port: string) => {
        const trimmed = port.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
    if (fromNode.type === 'mapper') {
      const mapperOutputs =
        fromNode.config?.mapper?.outputs ?? fromNode.outputs;
      mapperOutputs.forEach((output: string) => {
        const trimmed = output.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
  });
  const directPlaceholders = inputPorts.filter((port: string) => port !== 'bundle');
  const runtimeInputs = runtimeState.inputs?.[selectedNode.id] ?? {};
  const placeholderGroups: PlaceholderGroup[] = React.useMemo(() => {
    const groups: PlaceholderGroup[] = [];
    const uniqueDirect = Array.from(new Set(directPlaceholders));
    if (uniqueDirect.length > 0) {
      const directEntries = uniqueDirect.map((port: string, index: number) => {
        const value = runtimeInputs[port];
        return {
          id: `direct-${port}-${index}`,
          label: formatPortLabel(port),
          token: `{{${port}}}`,
          resolvesTo:
            value !== undefined ? formatRuntimeValue(value) : 'Connected input placeholder.',
        };
      });
      groups.push({
        id: 'direct',
        title: 'Connected Inputs',
        description: 'Placeholders from wired input ports.',
        entries: directEntries,
      });
    }

    const bundleEntries: PlaceholderGroup['entries'] = [];
    if (bundleKeys.size > 0) {
      let bundleContext: Record<string, unknown> | null = null;
      const bundleValue = runtimeInputs['bundle'];
      if (bundleValue && typeof bundleValue === 'object' && !Array.isArray(bundleValue)) {
        bundleContext = bundleValue as Record<string, unknown>;
      } else if (typeof bundleValue === 'string') {
        try {
          const parsed = JSON.parse(bundleValue) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            bundleContext = parsed as Record<string, unknown>;
          }
        } catch {
          bundleContext = null;
        }
      }
      Array.from(bundleKeys).forEach((key: string, index: number) => {
        const resolved = bundleContext ? bundleContext[key] : undefined;
        bundleEntries.push({
          id: `bundle-${key}-${index}`,
          label: key,
          token: `{{${key}}}`,
          resolvesTo:
            resolved !== undefined ? formatRuntimeValue(resolved) : `Bundle key: ${key}`,
        });
      });
    }
    if (bundleEntries.length > 0) {
      groups.push({
        id: 'bundle',
        title: 'Bundle Keys',
        description: 'Keys from connected Parser/Bundle/Mapper outputs.',
        entries: bundleEntries,
      });
    }

    const currentValue = runtimeInputs['result'] ?? runtimeInputs['value'];
    const currentResolved =
      currentValue !== undefined ? formatRuntimeValue(currentValue) : '—';
    groups.push({
      id: 'special',
      title: 'Current Value',
      description: 'Special placeholders bound to the current value.',
      entries: [
        {
          id: 'current-value',
          label: 'Current value',
          token: '{{value}}',
          resolvesTo: currentResolved,
          dynamic: true,
        },
        {
          id: 'current',
          label: 'Current',
          token: '{{current}}',
          resolvesTo: currentResolved,
          dynamic: true,
        },
      ],
    });

    return groups;
  }, [directPlaceholders, bundleKeys, runtimeInputs]);

  return (
    <div className='space-y-4'>
      <FormField 
        label='Prompt Template' 
        description={(
          <>
            Images are passed separately via the Prompt{' '}
            <span className='text-gray-300'>images</span> output and the Model{' '}
            <span className='text-gray-300'>images</span> input. You don&apos;t
            need an <span className='text-gray-300'>images</span> placeholder
            inside the prompt text.
          </>
        )}
      >
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[140px]'
          ref={promptTemplateRef}
          value={promptConfig.template}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            updateSelectedNodeConfig({
              prompt: { template: event.target.value },
            })
          }
          placeholder='Describe the product: {{title}}'
        />
      </FormField>
      <div className='rounded-md border border-border bg-card/50 p-3 text-[11px] text-gray-400'>
        <div className='flex items-center justify-between gap-2 text-gray-300'>
          <span>Available placeholders</span>
          <Button
            type='button'
            className='h-7 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50'
            onClick={() => setPlaceholderMatrixOpen(true)}
          >
            Placeholders
          </Button>
        </div>
        {bundleKeys.size > 0 ? (
          <div className='mt-2 flex flex-wrap gap-2'>
            {Array.from(bundleKeys).map((key: string) => (
              <span
                key={key}
                role='button'
                tabIndex={0}
                className='cursor-pointer rounded-full border px-2 py-0.5 text-[10px] text-gray-200 transition hover:border-gray-500 hover:bg-muted/50'
                onClick={() => insertPromptPlaceholder(`{{${key}}}`)}
                onKeyDown={(event: React.KeyboardEvent<HTMLSpanElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    insertPromptPlaceholder(`{{${key}}}`);
                  }
                }}
              >
                {formatPlaceholderLabel(key)}
              </span>
            ))}
          </div>
        ) : (
          <div className='mt-2 text-[11px] text-gray-500'>
            Connect a Parser or Bundle node to the bundle input to surface
            placeholder hints.
          </div>
        )}
        {directPlaceholders.length > 0 && (
          <div className='mt-3'>
            <div className='text-[11px] text-gray-500'>Direct inputs</div>
            <div className='mt-2 flex flex-wrap gap-2'>
              {directPlaceholders.map((port: string) => (
                <span
                  key={port}
                  role='button'
                  tabIndex={0}
                  className='cursor-pointer rounded-full border px-2 py-0.5 text-[10px] text-gray-200 transition hover:border-gray-500 hover:bg-muted/50'
                  onClick={() => insertPromptPlaceholder(`{{${port}}}`)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLSpanElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      insertPromptPlaceholder(`{{${port}}}`);
                    }
                  }}
                >
                  {formatPlaceholderLabel(port)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <PlaceholderMatrixDialog
        open={placeholderMatrixOpen}
        onOpenChange={setPlaceholderMatrixOpen}
        groups={placeholderGroups}
        target={placeholderTarget}
        onTargetChange={setPlaceholderTarget}
        targetOptions={[{ value: 'prompt', label: 'Prompt template' }]}
        onInsert={(token: string, _target: PlaceholderTarget) => insertPromptPlaceholder(token)}
      />
      {(() : React.JSX.Element => {
        const outgoingEdges = edges.filter(
          (edge: Edge) => edge.from === selectedNode.id
        );
        const aiEdge = outgoingEdges.find((edge: Edge) => {
          const targetNode = nodes.find((n: AiNode) => n.id === edge.to);
          return targetNode?.type === 'model';
        });
        const aiNode = aiEdge
          ? nodes.find((n: AiNode) => n.id === aiEdge.to && n.type === 'model')
          : null;
        const aiModelId = aiNode?.config?.model?.modelId;
        const hasPromptContent = promptConfig.template && promptConfig.template.trim().length > 0;

        return (
          <div className='mt-4 space-y-2'>
            {aiNode ? (
              <Alert variant='success' className='py-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-emerald-100'>
                    Connected to AI Model:{' '}
                    <span className='font-medium text-emerald-200'>{aiModelId || 'Unknown'}</span>
                  </span>
                </div>
                {onSendToAi && hasPromptContent && (
                  <Button
                    type='button'
                    variant='outline'
                    className='mt-2 h-7 px-3 text-[10px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50'
                    disabled={sendingToAi}
                    onClick={() => {
                      if (!onSendToAi) return;
                      if (!resolvedPrompt.trim() || resolvedPrompt === 'Prompt: (no template)') {
                        toast('Resolved prompt is empty. Run the graph or provide inputs first.', { variant: 'error' });
                        return;
                      }
                      void onSendToAi(selectedNode.id, resolvedPrompt);
                    }}
                  >
                    {sendingToAi ? 'Sending...' : 'Send to AI Model'}
                  </Button>
                )}
              </Alert>
            ) : (
              <Alert variant='warning' className='py-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] text-amber-100'>
                    Not connected to AI Model
                  </span>
                </div>
              </Alert>
            )}
            <p className='text-[11px] text-gray-500'>
              Connect this node&apos;s <span className='text-gray-300'>prompt</span> output to an AI Model node to enable direct sending.
            </p>
          </div>
        );
      })()}

      <div className='mt-4'>
        <FormField 
          label='Resolved Prompt'
          description={(
            <>
              Uses incoming ports (including <span className='text-gray-300'>result</span>) to substitute placeholders.
              Use <span className='text-gray-300'>{'{{value}}'}</span> or{' '}
              <span className='text-gray-300'>{'{{result}}'}</span>.
            </>
          )}
          actions={
            <Button
              type='button'
              className='h-7 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/50 disabled:opacity-50'
              onClick={() => {
                if (!resolvedPrompt.trim()) {
                  toast('Resolved prompt is empty.', { variant: 'error' });
                  return;
                }
                void navigator.clipboard
                  .writeText(resolvedPrompt)
                  .then(() => toast('Resolved prompt copied.', { variant: 'success' }))
                  .catch(() => toast('Failed to copy.', { variant: 'error' }));
              }}
              disabled={!resolvedPrompt.trim()}
              title='Copy the resolved prompt (after placeholder substitution)'
            >
              Copy Resolved
            </Button>
          }
        >
          <Textarea
            variant='subtle'
            size='sm'
            className='min-h-[120px]'
            value={resolvedPrompt}
            readOnly
            placeholder='Run the graph to resolve placeholders.'
          />
        </FormField>
      </div>

      {(() : React.JSX.Element => {
        const resultValue = runtimeState.inputs?.[selectedNode.id]?.['result']
          ?? runtimeState.outputs?.[selectedNode.id]?.['result'];
        const hasResult = resultValue !== undefined && resultValue !== null;
        const displayValue = hasResult
          ? (typeof resultValue === 'string'
            ? resultValue
            : formatRuntimeValue(resultValue))
          : '';
        const resultEdge = incomingEdges.find((edge: Edge) => edge.toPort === 'result');
        const resultSourceNode = resultEdge
          ? nodes.find((node: AiNode) => node.id === resultEdge.from)
          : null;
        const resultSourcePort = resultEdge?.fromPort ?? null;
        const resultSourcePollStatus =
          resultSourceNode?.type === 'poll'
            ? (runtimeState.outputs?.[resultSourceNode.id]?.['status'] as string | undefined)
            : undefined;
        const resultSourceModelHasPoll =
          resultSourceNode?.type === 'model'
            ? edges.some((edge: Edge): boolean => {
              if (edge.from !== resultSourceNode.id) return false;
              if (edge.fromPort !== 'jobId') return false;
              const target = nodes.find((node: AiNode): boolean => node.id === edge.to);
              return target?.type === 'poll';
            })
            : false;
        const resultSourceModelWaits =
          resultSourceNode?.type === 'model'
            ? resultSourceNode.config?.model?.waitForResult !== false
            : false;

        return (
          <div className='mt-4'>
            <FormField 
              label='Result Input'
              description='Shows the value passed through the result input port.'
            >
              <Textarea
                variant='subtle'
                size='sm'
                className='min-h-[100px]'
                value={displayValue}
                readOnly
                placeholder='No result received yet. Connect a node to the result input and run the graph.'
              />
            </FormField>
            {!hasResult && resultSourceNode?.type === 'model' && resultSourceModelHasPoll && !resultSourceModelWaits && resultSourcePort === 'result' && (
              <Alert variant='warning' className='mt-2 py-2 text-[11px]'>
                This Prompt is connected to <span className='text-amber-200'>Model.result</span>, but that Model has a{' '}
                <span className='text-amber-200'>Poll</span> connected and{' '}
                <span className='text-amber-200'>Wait for result</span> is disabled, so the Model emits only{' '}
                <span className='text-amber-200'>jobId</span>. Connect{' '}
                <span className='text-amber-200'>Poll.result</span> instead, or enable{' '}
                <span className='text-amber-200'>Wait for result</span> on the Model node.
              </Alert>
            )}
            {!hasResult && resultSourceNode?.type === 'poll' && resultSourcePollStatus === 'polling' && (
              <Alert variant='info' className='mt-2 py-2 text-[11px]'>
                Poll is still running. The <span className='text-sky-200'>result</span> will populate when polling completes.
              </Alert>
            )}
            {!hasResult && resultSourceNode?.type === 'poll' && resultSourcePollStatus === 'failed' && (
              <Alert variant='error' className='mt-2 py-2 text-[11px]'>
                Poll failed. Check the Poll node output for an error, or verify the job/database query configuration.
              </Alert>
            )}
          </div>
        );
      })()}
    </div>
  );
}
