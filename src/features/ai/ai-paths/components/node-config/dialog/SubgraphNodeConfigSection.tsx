'use client';

import React from 'react';

import type { SubgraphConfig } from '@/shared/lib/ai-paths';
import { Label, Input, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function SubgraphNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig, activePathId } = useAiPathConfig();

  if (selectedNode?.type !== 'subgraph') return null;

  const subgraphConfig: SubgraphConfig = selectedNode.config?.subgraph ?? {
    pathId: activePathId ?? '',
  };

  const handleFieldChange =
    (field: keyof SubgraphConfig) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        updateSelectedNodeConfig({
          subgraph: {
            ...subgraphConfig,
            [field]: event.target.value,
          },
        });
      };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Subgraph Path ID</Label>
        <Input
          className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
          placeholder='e.g. path_123'
          value={subgraphConfig.pathId ?? ''}
          onChange={handleFieldChange('pathId')}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          ID of the AI Path to invoke as a subgraph. By default this is prefilled with the current
          path ID.
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Subgraph trigger node ID (optional)</Label>
        <Input
          className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
          placeholder='Node ID inside the subgraph to treat as trigger'
          value={subgraphConfig.triggerNodeId ?? ''}
          onChange={handleFieldChange('triggerNodeId')}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          If empty, the subgraph&apos;s own trigger node will be used.
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Subgraph name (optional)</Label>
        <Input
          className='h-8 rounded-md border border-border bg-card/70 text-xs text-gray-100'
          placeholder='e.g. enrichment_subgraph'
          value={subgraphConfig.subgraphName ?? ''}
          onChange={handleFieldChange('subgraphName')}
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Input mapping JSON (optional)</Label>
        <Textarea
          className='mt-1 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder={'{\n  "value": "subgraphInput",\n  "context": "subgraphContext"\n}'}
          value={subgraphConfig.inputMappingJson ?? ''}
          onChange={handleFieldChange('inputMappingJson')}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Optional mapping from this node&apos;s inputs to subgraph inputs. Keys are local input
          port names, values are subgraph input port names.
        </p>
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Output mapping JSON (optional)</Label>
        <Textarea
          className='mt-1 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-gray-100'
          placeholder={'{\n  "subgraphResult": "value"\n}'}
          value={subgraphConfig.outputMappingJson ?? ''}
          onChange={handleFieldChange('outputMappingJson')}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Optional mapping from subgraph outputs back to this node&apos;s outputs. Keys are
          subgraph output port names, values are local output port names.
        </p>
        <p className='mt-1 text-[11px] text-amber-300'>
          Note: Subgraph execution is not yet supported in the local runtime. This configuration is
          stored for future use by the AI Paths service.
        </p>
      </div>
    </div>
  );
}

