'use client';

import React from 'react';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { Button } from '@/shared/ui';
import { useAiPathConfig } from '../../AiPathConfigContext';

type DatabaseAiPromptConnectionStatusProps = {
  aiPrompt: string;
  updateQueryConfig: (patch: { mode?: 'preset' | 'custom'; queryTemplate?: string }) => void;
};

export function DatabaseAiPromptConnectionStatus({
  aiPrompt,
  updateQueryConfig,
}: DatabaseAiPromptConnectionStatusProps): React.JSX.Element {
  const { edges, nodes, selectedNode, runtimeState, sendingToAi, onSendToAi, toast } =
    useAiPathConfig();
  const brainModel = useBrainModelOptions({
    capability: 'ai_paths.model',
    enabled: Boolean(selectedNode),
  });
  const brainModelId = brainModel.effectiveModelId.trim();

  if (!selectedNode) return <></>;
  const selectedNodeId = selectedNode.id;

  const aiPromptEdges = edges.filter(
    (edge: Edge): boolean => edge.from === selectedNodeId && edge.fromPort === 'aiPrompt'
  );
  const callbackEdges = edges.filter(
    (edge: Edge): boolean => edge.to === selectedNodeId && edge.toPort === 'queryCallback'
  );

  const aiNode =
    aiPromptEdges.length > 0
      ? nodes.find(
          (node: AiNode): boolean => node.id === aiPromptEdges[0]?.to && node.type === 'model'
        )
      : null;
  const selectedModelId = aiNode?.config?.model?.modelId?.trim() || '';
  const modelLabel = selectedModelId
    ? selectedModelId
    : `Use Brain default (${brainModelId || 'Not configured'})`;
  const modelMissingFromCatalog =
    Boolean(selectedModelId) &&
    !brainModel.models.some((modelId: string): boolean => modelId === selectedModelId);

  const hasValidConnection = aiNode && callbackEdges.length > 0;

  const callbackValue =
    runtimeState.inputs?.[selectedNodeId]?.['queryCallback'] ??
    runtimeState.outputs?.[selectedNodeId]?.['queryCallback'];
  const hasAiResponse = typeof callbackValue === 'string' && callbackValue.trim().length > 0;

  return (
    <div className='space-y-2'>
      {hasValidConnection ? (
        <div className='rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-2 rounded-full bg-emerald-400'></div>
            <span className='text-[11px] text-emerald-100'>
              Connected to AI Model:{' '}
              <span className='font-medium text-emerald-200'>{modelLabel}</span>
            </span>
          </div>
          {modelMissingFromCatalog ? (
            <div className='mt-1 text-[10px] text-amber-200'>
              This node&apos;s selected model is not currently in the AI Brain catalog.
            </div>
          ) : null}
          {hasAiResponse && (
            <Button
              type='button'
              className='mt-2 rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
              onClick={(): void => {
                updateQueryConfig({
                  mode: 'custom',
                  queryTemplate: callbackValue,
                });
                toast('AI response injected into query.', { variant: 'success' });
              }}
            >
              Inject AI Response into Query
            </Button>
          )}
          {onSendToAi && aiPrompt.trim() && (
            <Button
              type='button'
              className='mt-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50'
              disabled={sendingToAi}
              onClick={(): void => {
                void onSendToAi(selectedNodeId, aiPrompt);
              }}
            >
              {sendingToAi ? 'Sending...' : 'Send to AI Model'}
            </Button>
          )}
        </div>
      ) : (
        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-2 rounded-full bg-amber-400'></div>
            <span className='text-[11px] text-amber-100'>
              {aiNode && !callbackEdges.length
                ? 'AI node connected, but callback not wired'
                : !aiNode && callbackEdges.length > 0
                  ? 'Callback wired, but no AI node connected'
                  : 'Not connected to AI node'}
            </span>
          </div>
        </div>
      )}
      <p className='text-[11px] text-gray-500'>
        Connect this node&apos;s <span className='text-gray-300'>aiPrompt</span> output to an AI
        Node, then connect the AI&apos;s <span className='text-gray-300'>result</span> back to this
        node&apos;s <span className='text-gray-300'>queryCallback</span> input.
      </p>
    </div>
  );
}
