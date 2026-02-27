'use client';

import React from 'react';

import {
  PARSER_PRESETS,
  createParserMappings,
  inferImageMappingPath,
  normalizePortName,
  type ParserConfig,
} from '@/features/ai/ai-paths/lib';
import { Button, FormField, SelectSimple } from '@/shared/ui';

import { 
  useAiPathSelection, 
  useAiPathGraph, 
  useAiPathRuntime, 
  useAiPathOrchestrator 
} from '@/features/ai/ai-paths/components/AiPathConfigContext';
import { ParserSampleSection } from './parser/ParserSampleSection';
import { ParserMappingList } from './parser/ParserMappingList';

export function ParserNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
  } = useAiPathSelection();

  const {
    nodes,
  } = useAiPathGraph();

  const {
    runtimeState,
    parserSamples,
    parserSampleLoading,
    handleFetchParserSample,
  } = useAiPathRuntime();

  const {
    updateSelectedNode,
    toast,
  } = useAiPathOrchestrator();

  const [parserDraftMappings, setParserDraftMappings] = React.useState<Record<string, string>>({});
  const [parserDraftNodeId, setParserDraftNodeId] = React.useState<string | null>(null);
  const parserDraftTimerRef = React.useRef<number | null>(null);

  if (selectedNode?.type !== 'parser') return null;

  const isParserNode = true;

  const parserConfig: ParserConfig = selectedNode.config?.parser ?? {
    mappings: createParserMappings(selectedNode.outputs ?? []),
    outputMode: 'individual',
    presetId: PARSER_PRESETS[0]?.id ?? 'custom',
  };

  React.useEffect((): void | (() => void) => {
    if (!isParserNode) return;
    const nextMappings =
      selectedNode.config?.parser?.mappings ??
      createParserMappings(selectedNode.outputs ?? []);
    setParserDraftNodeId(selectedNode.id);
    setParserDraftMappings(nextMappings);
    return (): void => {
      if (parserDraftTimerRef.current) {
        window.clearTimeout(parserDraftTimerRef.current);
        parserDraftTimerRef.current = null;
      }
    };
  }, [
    selectedNode.id,
    isParserNode,
    selectedNode.config?.parser?.mappings,
    selectedNode.outputs,
  ]);

  const mappings = React.useMemo(
    () => parserConfig.mappings ?? createParserMappings(selectedNode.outputs ?? []),
    [parserConfig.mappings, selectedNode.outputs]
  );
  const draftMappings =
    parserDraftNodeId === selectedNode.id ? parserDraftMappings : mappings;
  const outputMode = parserConfig.outputMode ?? 'individual';
  const presetId =
    parserConfig.presetId ?? PARSER_PRESETS[0]?.id ?? 'custom';
  const presetOptions = [
    ...PARSER_PRESETS,
    {
      id: 'custom',
      label: 'Custom',
    },
  ];

  const nodeSample = runtimeState.outputs?.[selectedNode.id] ?? {};
  const samples = parserSamples[selectedNode.id];

  const handleUpdateMappings = (nextMappings: Record<string, string>): void => {
    setParserDraftMappings(nextMappings);
    setParserDraftNodeId(selectedNode.id);

    if (parserDraftTimerRef.current) {
      window.clearTimeout(parserDraftTimerRef.current);
    }

    parserDraftTimerRef.current = window.setTimeout(() => {
      updateSelectedNode({
        config: {
          ...selectedNode.config,
          parser: {
            ...parserConfig,
            mappings: nextMappings,
            presetId: 'custom',
          },
        },
      });
    }, 1000);
  };

  const handleApplyPreset = (nextPresetId: string): void => {
    const preset = PARSER_PRESETS.find((p) => p.id === nextPresetId);
    if (!preset) return;

    const nextMappings: Record<string, string> = {};
    const outputs = selectedNode.outputs ?? [];
    
    Object.entries(preset.mappings as Record<string, string>).forEach(([port, path]) => {
      if (outputs.includes(port)) {
        nextMappings[port] = path;
      }
    });

    updateSelectedNode({
      config: {
        ...selectedNode.config,
        parser: {
          ...parserConfig,
          presetId: nextPresetId,
          mappings: nextMappings,
        },
      },
    });
  };

  const handleMappingChange = (port: string, path: string): void => {
    const nextMappings = {
      ...draftMappings,
      [port]: path,
    };
    handleUpdateMappings(nextMappings);
  };

  const handleInferFromSample = (): void => {
    const json = samples?.json;
    if (!json) {
      toast('Fetch a sample first to infer mappings.', { variant: 'info' });
      return;
    }

    const nextMappings: Record<string, string> = {};
    (selectedNode.outputs ?? []).forEach((port) => {
      const inferred = inferImageMappingPath(json, port);
      if (inferred) {
        nextMappings[port] = inferred;
      }
    });

    handleUpdateMappings(nextMappings);
  };

  const handleAutoFill = (): void => {
    const nextMappings = { ...draftMappings };
    (selectedNode.outputs ?? []).forEach((port) => {
      if (!nextMappings[port]) {
        nextMappings[port] = normalizePortName(port);
      }
    });
    handleUpdateMappings(nextMappings);
  };

  const handleClearAll = (): void => {
    handleUpdateMappings({});
  };

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-4'>
        <FormField label='Output Mode'>
          <SelectSimple
            value={outputMode}
            onValueChange={(val) =>
              updateSelectedNode({
                config: {
                  ...selectedNode.config,
                  parser: {
                    ...parserConfig,
                    outputMode: val as 'individual' | 'combined',
                  },
                },
              })
            }
            options={[
              { id: 'individual', label: 'Individual Ports' },
              { id: 'combined', label: 'Combined JSON' },
            ]}
          />
        </FormField>

        <FormField label='Preset'>
          <SelectSimple
            value={presetId}
            onValueChange={handleApplyPreset}
            options={presetOptions}
          />
        </FormField>
      </div>

      <ParserSampleSection
        nodeId={selectedNode.id}
        nodes={nodes}
        sample={samples}
        loading={parserSampleLoading}
        onFetch={handleFetchParserSample}
        onInfer={handleInferFromSample}
      />

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h4 className='text-sm font-medium'>Port Mappings</h4>
          <div className='flex gap-2'>
            <Button variant='ghost' size='sm' onClick={handleAutoFill}>
              Auto-fill
            </Button>
            <Button variant='ghost' size='sm' onClick={handleClearAll}>
              Clear
            </Button>
          </div>
        </div>

        <ParserMappingList
          outputs={selectedNode.outputs ?? []}
          mappings={draftMappings}
          nodeSample={nodeSample}
          onMappingChange={handleMappingChange}
        />
      </div>
    </div>
  );
}
