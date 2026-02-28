'use client';

import Image from 'next/image';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { createViewerOutputs, formatRuntimeValue } from '@/shared/lib/ai-paths';
import { extractImageUrls, formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Button, Textarea, FormField } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function ViewerNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    edges,
    runtimeState,
    updateSelectedNodeConfig,
    clearRuntimeForNode,
  } = useAiPathConfig();

  if (selectedNode?.type !== 'viewer') return null;

  const viewerConfig = selectedNode.config?.viewer ?? {
    outputs: createViewerOutputs(selectedNode.inputs),
    showImagesAsJson: false,
  };
  const showImagesAsJson = viewerConfig.showImagesAsJson ?? false;
  const connections = edges.filter((edge: Edge): boolean => edge.to === selectedNode.id);
  const isConnectedToTrigger = ((): boolean => {
    const triggerIds = nodes
      .filter((node: AiNode): boolean => node.type === 'trigger')
      .map((node: AiNode): string => node.id);
    if (triggerIds.length === 0) return false;
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge: Edge): void => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const visited = new Set<string>();
    const queue = [...triggerIds];
    triggerIds.forEach((id: string): void => {
      visited.add(id);
    });
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor: string): void => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return visited.has(selectedNode.id);
  })();
  const runtimeInputs = runtimeState.inputs?.[selectedNode.id] ?? {};
  const resolvedRuntimeInputs = selectedNode.inputs.reduce<Record<string, unknown>>(
    (acc: Record<string, unknown>, input: string): Record<string, unknown> => {
      const directValue = runtimeInputs[input];
      if (directValue !== undefined) {
        acc[input] = directValue;
        return acc;
      }
      const matchingEdges = connections.filter(
        (edge: Edge): boolean => edge.toPort === input || !edge.toPort
      );
      const merged = matchingEdges.reduce<unknown>((current: unknown, edge: Edge): unknown => {
        const fromNodeId = edge.from;
        if (!fromNodeId) return current;
        const fromOutput = runtimeState.outputs?.[fromNodeId];
        if (!fromOutput) return current;
        const fromPort = edge.fromPort;
        if (!fromPort) return current;
        const value = fromOutput[fromPort];
        if (value === undefined) return current;
        if (current === undefined) return value;
        if (Array.isArray(current)) return [...(current as unknown[]), value];
        return [current, value];
      }, undefined);
      if (merged !== undefined) {
        acc[input] = merged;
      }
      return acc;
    },
    {}
  );
  const outputValues: Record<string, string> = {
    ...createViewerOutputs(selectedNode.inputs),
    ...viewerConfig.outputs,
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-xs text-gray-400'>Review outputs that flow into this node.</div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='h-7'
            onClick={(): void => {
              updateSelectedNodeConfig({
                viewer: {
                  outputs: createViewerOutputs(selectedNode.inputs),
                  showImagesAsJson,
                },
              });
              clearRuntimeForNode?.(selectedNode.id);
            }}
          >
            Clear
          </Button>
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='h-7'
            onClick={(): void =>
              updateSelectedNodeConfig({
                viewer: {
                  ...viewerConfig,
                  showImagesAsJson: !showImagesAsJson,
                },
              })
            }
          >
            {showImagesAsJson ? 'Images: JSON' : 'Images: Thumbnails'}
          </Button>
        </div>
      </div>
      {!isConnectedToTrigger && (
        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          This Result Viewer is not connected to a Trigger path, so it will not update when you fire
          triggers. Connect it to the same path as a Trigger (directly or through other nodes).
        </div>
      )}
      {selectedNode.inputs.map((input: string): React.JSX.Element => {
        const connectedSources = connections
          .filter((edge: Edge): boolean => !edge.toPort || edge.toPort === input)
          .map((edge: Edge): string | null => {
            const fromNode = nodes.find((node: AiNode): boolean => node.id === edge.from);
            if (!fromNode) return null;
            const portLabel = edge.fromPort ? `:${edge.fromPort}` : '';
            return `${fromNode.title}${portLabel}`;
          })
          .filter(Boolean)
          .join(', ');
        const runtimeValue = resolvedRuntimeInputs[input];
        const imageUrls = input === 'images' ? extractImageUrls(runtimeValue) : [];
        const hasImagePreview = input === 'images' && imageUrls.length > 0 && !showImagesAsJson;
        return (
          <FormField
            key={input}
            label={formatPortLabel(input)}
            actions={
              connectedSources ? (
                <span className='text-[10px] text-gray-500 font-mono'>
                  Connected: {connectedSources}
                </span>
              ) : undefined
            }
          >
            {runtimeValue !== undefined && (
              <div className='mb-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100'>
                <div className='mb-1 text-[9px] uppercase font-bold text-emerald-300'>
                  Latest Runtime Value
                </div>
                {hasImagePreview ? (
                  <>
                    <div className='text-[10px] text-emerald-200'>
                      Detected {imageUrls.length} image
                      {imageUrls.length === 1 ? '' : 's'}
                    </div>
                    <div className='mt-2 grid grid-cols-3 gap-2'>
                      {imageUrls.map(
                        (url: string, index: number): React.JSX.Element => (
                          <div
                            key={`${url}-${index}`}
                            className='overflow-hidden rounded border border-emerald-500/30 bg-black/30'
                          >
                            <Image
                              src={url}
                              alt={`Image ${index + 1}`}
                              className='h-20 w-full object-cover'
                              loading='lazy'
                              width={80}
                              height={80}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <pre className='whitespace-pre-wrap font-mono'>
                    {formatRuntimeValue(runtimeValue)}
                  </pre>
                )}
              </div>
            )}
            <Textarea
              variant='subtle'
              size='sm'
              className='min-h-[90px]'
              value={outputValues[input] ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                updateSelectedNodeConfig({
                  viewer: {
                    ...viewerConfig,
                    outputs: {
                      ...outputValues,
                      [input]: event.target.value,
                    },
                  },
                })
              }
            />
          </FormField>
        );
      })}
    </div>
  );
}
