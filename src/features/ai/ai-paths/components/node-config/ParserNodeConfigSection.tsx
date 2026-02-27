'use client';

import React from 'react';







import type {
  AiNode,
  ParserConfig,
  ParserSampleState,
} from '@/features/ai/ai-paths/lib';
import {
  PARSER_PATH_OPTIONS,
  PARSER_PRESETS,
  buildFlattenedMappings,
  buildTopLevelMappings,
  createParserMappings,
  extractJsonPathEntries,
  inferImageMappingPath,
  normalizePortName,
  safeParseJson,
} from '@/features/ai/ai-paths/lib';
import { Button, FormField, Input, SelectSimple, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../AiPathConfigContext';

export function ParserNodeConfigSection(): React.JSX.Element | null {
  const {
    selectedNode,
    nodes,
    runtimeState,
    parserSamples,
    setParserSamples,
    parserSampleLoading,
    updateSelectedNode,
    updateSelectedNodeConfig: _updateSelectedNodeConfig,
    handleFetchParserSample,
    toast,
  } = useAiPathConfig();

  const [parserDraftMappings, setParserDraftMappings] = React.useState<Record<string, string>>({});
  const [parserDraftNodeId, setParserDraftNodeId] = React.useState<string | null>(null);
  const parserDraftTimerRef = React.useRef<number | null>(null);

  if (selectedNode?.type !== 'parser') return null;

  const isParserNode = true;

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

  const parserConfig: ParserConfig = selectedNode.config?.parser ?? {
    mappings: createParserMappings(selectedNode.outputs),
    outputMode: 'individual',
    presetId: PARSER_PRESETS[0]?.id ?? 'custom',
  };
  const mappings = React.useMemo(
    () => parserConfig.mappings ?? createParserMappings(selectedNode.outputs),
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
      description: 'Use manual mappings.',
      mappings: {},
    },
  ];
  const activePreset =
    presetOptions.find((preset: { id: string }) => preset.id === presetId) ?? null;
  const sampleState =
    parserSamples[selectedNode.id] ?? {
      entityType: 'product',
      entityId: '',
      simulationId: '',
      json: '',
      mappingMode: 'top',
      depth: 2,
      keyStyle: 'path',
      includeContainers: false,
    };
  const simulationOptions = React.useMemo(
    () =>
      nodes
        .filter((node: AiNode): boolean => node.type === 'simulation')
        .map((node: AiNode) => {
          const simConfig = node.config?.simulation;
          const entityId =
            simConfig?.entityId?.trim() || simConfig?.productId?.trim() || '';
          const entityType = simConfig?.entityType?.trim() || 'product';
          return {
            id: node.id,
            label: `${node.title} · ${entityType}:${entityId || 'missing id'}`,
            entityId,
            entityType,
          };
        })
        .filter((option: { entityId: string }) => option.entityId),
    [nodes]
  );
  const parsedSample = React.useMemo(
    () => safeParseJson(sampleState.json),
    [sampleState.json]
  );
  const sampleValue = parsedSample.value;
  const sampleMappings = React.useMemo(() => {
    if (!sampleValue) return {};
    if (sampleState.mappingMode === 'flatten') {
      return buildFlattenedMappings(
        sampleValue,
        sampleState.depth ?? 2,
        sampleState.keyStyle ?? 'path',
        sampleState.includeContainers ?? false
      );
    }
    return buildTopLevelMappings(sampleValue);
  }, [
    sampleValue,
    sampleState.mappingMode,
    sampleState.depth,
    sampleState.keyStyle,
    sampleState.includeContainers,
  ]);
  const sampleEntries = React.useMemo(
    () =>
      sampleValue
        ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
        : [],
    [sampleValue, sampleState.depth]
  );
  const samplePaths = React.useMemo(
    () =>
      sampleEntries
        .filter((entry: { type: string }) => {
          if (sampleState.includeContainers) return true;
          return entry.type === 'value' || entry.type === 'array';
        })
        .map((entry: { path: string }) => entry.path),
    [sampleEntries, sampleState.includeContainers]
  );
  const samplePathOptions = React.useMemo(
    () =>
      samplePaths.map((path: string) => {
        const value = path.startsWith('[') ? `$${path}` : `$.${path}`;
        return { label: `Sample: ${path}`, value };
      }),
    [samplePaths]
  );
  const parserRuntimeInputs = (runtimeState.inputs?.[selectedNode.id] ?? {});
  const parserContext =
    parserRuntimeInputs['context'] && typeof parserRuntimeInputs['context'] === 'object'
      ? (parserRuntimeInputs['context'] as Record<string, unknown>)
      : null;
  const parserContextEntity =
    parserContext?.['entity'] ||
    parserContext?.['entityJson'] ||
    parserContext?.['product'] ||
    null;
  const parserSourceLabel = parserRuntimeInputs['entityJson']
    ? 'entityJson input'
    : parserContextEntity
      ? 'context entity'
      : parserRuntimeInputs['context']
        ? 'context (no entity)'
        : 'no runtime input yet';
  const suggestedPathOptions = React.useMemo(
    () =>
      samplePathOptions.length
        ? [...samplePathOptions, ...PARSER_PATH_OPTIONS]
        : PARSER_PATH_OPTIONS,
    [samplePathOptions]
  );
  const uniqueSuggestedPathOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          suggestedPathOptions.map((option: { value: string; label: string }) => [
            option.value,
            option,
          ])
        ).values()
      ),
    [suggestedPathOptions]
  );
  const entries = React.useMemo(() => Object.entries(draftMappings), [draftMappings]);
  const commitMappingsDebounced = (
    nextMappings: Record<string, string>,
    nextMode: 'individual' | 'bundle' = outputMode,
    nextPresetId: string = presetId
  ): void => {
    setParserDraftNodeId(selectedNode.id);
    setParserDraftMappings(nextMappings);
    if (parserDraftTimerRef.current) {
      window.clearTimeout(parserDraftTimerRef.current);
    }
    parserDraftTimerRef.current = window.setTimeout((): void => {
      commitMappings(nextMappings, nextMode, nextPresetId);
    }, 500);
  };
  const commitMappingsImmediate = (
    nextMappings: Record<string, string>,
    nextMode: 'individual' | 'bundle' = outputMode,
    nextPresetId: string = presetId
  ): void => {
    setParserDraftNodeId(selectedNode.id);
    setParserDraftMappings(nextMappings);
    if (parserDraftTimerRef.current) {
      window.clearTimeout(parserDraftTimerRef.current);
      parserDraftTimerRef.current = null;
    }
    commitMappings(nextMappings, nextMode, nextPresetId);
  };
  const commitMappings = (
    nextMappings: Record<string, string>,
    nextMode: 'individual' | 'bundle' = outputMode,
    nextPresetId: string = presetId
  ): void => {
    const normalizedMappings = Object.entries(nextMappings).reduce<Record<string, string>>(
      (
        acc: Record<string, string>,
        [rawKey, rawPath]: [string, string]
      ): Record<string, string> => {
        const key = normalizePortName(rawKey).trim();
        if (!key) return acc;
        const path = typeof rawPath === 'string' ? rawPath : '';
        if (!(key in acc) || (!acc[key] && path)) {
          acc[key] = path;
        }
        return acc;
      },
      {}
    );
    const keys = Object.keys(normalizedMappings)
      .map((key: string) => key.trim())
      .filter(Boolean);
    const hasImagesOutput = keys.some(
      (key: string) =>
        key.toLowerCase() === 'images' || key.toLowerCase() === 'imageurls'
    );
    const nextOutputs =
      nextMode === 'bundle'
        ? ['bundle', ...(hasImagesOutput ? ['images'] : [])]
        : keys;
    updateSelectedNode({
      outputs: nextOutputs.length ? nextOutputs : selectedNode.outputs,
      config: {
        ...selectedNode.config,
        parser: {
          mappings: normalizedMappings,
          outputMode: nextMode,
          presetId: nextPresetId,
        },
      },
    });
  };
  const addMapping = (baseKey: string, defaultPath: string): void => {
    let nextKey = baseKey;
    let counter = 1;
    while (draftMappings[nextKey]) {
      counter += 1;
      nextKey = `${baseKey}_${counter}`;
    }
    commitMappingsImmediate({ ...draftMappings, [nextKey]: defaultPath });
  };
  const updateMappingKey = (index: number, value: string): void => {
    const nextEntries = entries.map((entry: [string, string], idx: number): [string, string] => {
      if (idx !== index) return entry;
      const nextKey = value.trim() || entry[0];
      return [nextKey, entry[1]] as [string, string];
    });
    const nextMappings: Record<string, string> = {};
    (nextEntries).forEach(([key, path]: [string, string]) => {
      if (!key?.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsDebounced(nextMappings);
  };
  const updateMappingPath = (index: number, value: string): void => {
    const nextEntries = entries.map((entry: [string, string], idx: number): [string, string] =>
      idx === index ? [entry[0], value] : entry
    );
    const nextMappings: Record<string, string> = {};
    nextEntries.forEach(([key, path]: [string, string]) => {
      if (!key?.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsDebounced(nextMappings);
  };
  const removeMapping = (index: number): void => {
    if (entries.length <= 1) return;
    const nextEntries = entries.filter((_: [string, string], idx: number) => idx !== index);
    const nextMappings: Record<string, string> = {};
    nextEntries.forEach(([key, path]: [string, string]) => {
      if (!key?.trim()) return;
      nextMappings[key.trim()] = path;
    });
    commitMappingsImmediate(nextMappings);
  };
  const applyPreset = (mode: 'replace' | 'merge'): void => {
    if (!activePreset || activePreset.id === 'custom') return;
    const presetMappings = Object.entries(activePreset.mappings).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );
    if (mode === 'replace') {
      commitMappingsImmediate(
        presetMappings,
        outputMode,
        activePreset.id
      );
      return;
    }
    const merged: Record<string, string> = { ...draftMappings };
    Object.entries(presetMappings).forEach(([key, value]: [string, string]) => {
      if (!(key in merged)) {
        merged[key] = value;
      }
    });
    commitMappingsImmediate(merged, outputMode, activePreset.id);
  };
  const applySampleMappings = (mode: 'replace' | 'merge'): void => {
    const keys = Object.keys(sampleMappings);
    if (keys.length === 0) return;
    if (mode === 'replace') {
      commitMappingsImmediate(sampleMappings, outputMode, 'custom');
      return;
    }
    const merged: Record<string, string> = { ...draftMappings };
    keys.forEach((key: string) => {
      if (!(key in merged)) {
        merged[key] = sampleMappings[key] ?? '';
      }
    });
    commitMappingsImmediate(merged, outputMode, 'custom');
  };
  const handleDetectImages = (): void => {
    if (!sampleValue) {
      toast('Provide sample JSON to detect image fields.', { variant: 'error' });
      return;
    }
    const detected = inferImageMappingPath(
      sampleValue,
      sampleState.depth ?? 2
    );
    if (!detected) {
      toast('No image-like field detected in the sample.', { variant: 'error' });
      return;
    }
    if (imageEntryIndex >= 0) {
      const nextEntries = entries.map((entry: [string, string], idx: number): [string, string] =>
        idx === imageEntryIndex ? [entry[0], detected] : entry
      );
      const nextMappings: Record<string, string> = {};
      nextEntries.forEach(([key, path]: [string, string]) => {
        if (!key?.trim()) return;
        nextMappings[key.trim()] = path;
      });
      commitMappingsImmediate(nextMappings);
      toast(`Image field detected: ${detected}`, { variant: 'success' });
      return;
    }
    commitMappingsImmediate({ ...draftMappings, images: detected });
    toast(`Image field detected: ${detected}`, { variant: 'success' });
  };
  if (!isParserNode) return null;

  const imageEntryIndex = entries.findIndex(([key]: [string, string]) =>
    key.toLowerCase().includes('image')
  );

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2 text-[11px] text-gray-300'>
        <div className='text-gray-400'>Input source</div>
        <div className='mt-1 text-sm text-gray-200'>{parserSourceLabel}</div>
      </div>
      
      <FormField label='Preset'>
        <SelectSimple size='sm'
          value={presetId}
          onValueChange={(value: string) =>
            commitMappingsImmediate(draftMappings, outputMode, value)
          }
          options={presetOptions.map((p: { id: string; label: string; description?: string }) => ({ value: p.id, label: p.label, description: (p as { description?: string }).description }))}
          placeholder='Select preset'
          variant='subtle'
        />
        <div className='mt-3 flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            className='h-7 text-[10px]'
            onClick={() => applyPreset('replace')}
          >
            Replace mappings
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-7 text-[10px]'
            onClick={() => applyPreset('merge')}
          >
            Add missing fields
          </Button>
        </div>
      </FormField>

      <FormField label='Sample JSON'>
        <div className='grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center'>
          <SelectSimple size='sm'
            value={sampleState.entityType}
            onValueChange={(value: string) =>
              setParserSamples((prev: Record<string, ParserSampleState>) => ({
                ...prev,
                [selectedNode.id]: {
                  ...sampleState,
                  entityType: value,
                },
              }))
            }
            options={[
              { value: 'product', label: 'Product' },
              { value: 'note', label: 'Note' },
              { value: 'custom', label: 'Custom' },
            ]}
            placeholder='Entity type'
            variant='subtle'
          />
          <div className='space-y-2'>
            <Input
              variant='subtle'
              size='sm'
              value={sampleState.entityId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setParserSamples((prev: Record<string, ParserSampleState>) => ({
                  ...prev,
                  [selectedNode.id]: {
                    ...sampleState,
                    entityId: event.target.value,
                    simulationId: '',
                  },
                }))
              }
              placeholder='Entity ID'
            />
            {simulationOptions.length > 0 && (
              <SelectSimple size='sm'
                value={sampleState.simulationId ?? ''}
                onValueChange={(value: string) => {
                  const option = simulationOptions.find(
                    (item: { id: string }) => item.id === value
                  );
                  if (!option) return;
                  setParserSamples((prev: Record<string, ParserSampleState>) => ({
                    ...prev,
                    [selectedNode.id]: {
                      ...sampleState,
                      entityType: option.entityType,
                      entityId: option.entityId,
                      simulationId: option.id,
                    },
                  }));
                }}
                options={simulationOptions.map((opt: { id: string; label: string }) => ({ value: opt.id, label: opt.label }))}
                placeholder='Use simulation ID'
                variant='subtle'
                triggerClassName='h-8 text-[10px]'
              />
            )}
          </div>
          <Button
            type='button'
            variant='outline'
            className='h-8 text-[10px]'
            disabled={parserSampleLoading}
            onClick={() =>
              void handleFetchParserSample(
                selectedNode.id,
                sampleState.entityType,
                sampleState.entityId
              )
            }
          >
            {parserSampleLoading ? 'Loading...' : 'Fetch sample'}
          </Button>
        </div>
        <Textarea
          variant='subtle'
          size='sm'
          className='mt-2 min-h-[120px]'
          value={sampleState.json}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setParserSamples((prev: Record<string, ParserSampleState>) => ({
              ...prev,
              [selectedNode.id]: {
                ...sampleState,
                json: event.target.value,
              },
            }))
          }
          placeholder='{ "id": "123", "title": "Sample" }'
        />
        <div className='mt-2 flex flex-wrap gap-2'>
          <SelectSimple size='sm'
            value={sampleState.mappingMode}
            onValueChange={(value: string) =>
              setParserSamples((prev: Record<string, ParserSampleState>) => ({
                ...prev,
                [selectedNode.id]: {
                  ...sampleState,
                  mappingMode: value as 'top' | 'flatten',
                },
              }))
            }
            options={[
              { value: 'top', label: 'Top-level fields' },
              { value: 'flatten', label: 'Flatten nested' },
            ]}
            className='w-[180px]'
          />
          <SelectSimple size='sm'
            value={String(sampleState.depth)}
            onValueChange={(value: string) =>
              setParserSamples((prev: Record<string, ParserSampleState>) => ({
                ...prev,
                [selectedNode.id]: {
                  ...sampleState,
                  depth: Number(value),
                },
              }))
            }
            options={[1, 2, 3, 4].map((d: number) => ({ value: String(d), label: `Depth ${d}` }))}
            className='w-[160px]'
          />
          <Button
            type='button'
            className={`rounded-md border px-3 text-[10px] ${
              sampleState.includeContainers
                ? 'text-emerald-200 hover:bg-emerald-500/10'
                : 'text-gray-300 hover:bg-muted/60'
            }`}
            onClick={() =>
              setParserSamples((prev: Record<string, ParserSampleState>) => ({
                ...prev,
                [selectedNode.id]: {
                  ...sampleState,
                  includeContainers: !sampleState.includeContainers,
                },
              }))
            }
          >
            {sampleState.includeContainers ? 'Containers: On' : 'Containers: Off'}
          </Button>
          {sampleState.mappingMode === 'flatten' && (
            <SelectSimple size='sm'
              value={sampleState.keyStyle}
              onValueChange={(value: string) =>
                setParserSamples((prev: Record<string, ParserSampleState>) => ({
                  ...prev,
                  [selectedNode.id]: {
                    ...sampleState,
                    keyStyle: value as 'path' | 'leaf',
                  },
                }))
              }
              options={[
                { value: 'path', label: 'Path keys' },
                { value: 'leaf', label: 'Leaf keys' },
              ]}
              className='w-[170px]'
            />
          )}
        </div>
        {parsedSample.error ? (
          <p className='mt-2 text-[11px] text-rose-300'>
            {parsedSample.error}
          </p>
        ) : null}
        <div className='mt-3 flex flex-wrap gap-2'>
          {Object.keys(sampleMappings).length > 0 && (
            <>
              <Button
                type='button'
                className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
                onClick={() => applySampleMappings('replace')}
              >
                Auto-map from sample
              </Button>
              <Button
                type='button'
                className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
                onClick={() => applySampleMappings('merge')}
              >
                Add missing from sample
              </Button>
            </>
          )}
          <Button
            type='button'
            className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={handleDetectImages}
          >
            Detect images
          </Button>
        </div>
      </FormField>

      <FormField 
        label='Output Mode' 
        description='Bundle mode emits a single bundle port and uses mapping keys as placeholders for Prompt templates.'
      >
        <SelectSimple size='sm'
          value={outputMode}
          onValueChange={(value: string) =>
            commitMappingsImmediate(
              draftMappings,
              value as 'individual' | 'bundle'
            )
          }
          options={[
            { value: 'individual', label: 'Individual outputs' },
            { value: 'bundle', label: 'Single bundle output' },
          ]}
          variant='subtle'
        />
      </FormField>

      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={() => addMapping('title', '$.title')}
        >
          Add title
        </Button>
        <Button
          type='button'
          className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={() => addMapping('images', '$.images')}
        >
          Add images
        </Button>
        <Button
          type='button'
          className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={() => addMapping('productId', '$.id')}
        >
          Add id
        </Button>
        <Button
          type='button'
          className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={() => addMapping('sku', '$.sku')}
        >
          Add sku
        </Button>
        <Button
          type='button'
          className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={() => addMapping('price', '$.price')}
        >
          Add price
        </Button>
      </div>

      <div className='space-y-3'>
        {entries.map(([key, path]: [string, string], index: number) => (
          <div
            key={`${key}-${index}`}
            className='grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start'
          >
            <Input
              variant='subtle'
              size='sm'
              value={key}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateMappingKey(index, event.target.value)
              }
              placeholder='output key'
            />
            <div className='space-y-2'>
              <Input
                variant='subtle'
                size='sm'
                value={path}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  updateMappingPath(index, event.target.value)
                }
                placeholder='$.path.to.value'
              />
              <SelectSimple size='sm'
                onValueChange={(value: string) => updateMappingPath(index, value)}
                options={uniqueSuggestedPathOptions}
                placeholder='Pick a suggested path'
                variant='subtle'
                triggerClassName='h-8 text-[10px]'
                value=''
              />
            </div>
            <Button
              type='button'
              variant='outline'
              disabled={entries.length <= 1}
              className='h-8 px-2 text-[10px]'
              onClick={() => removeMapping(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className='grid gap-2 sm:grid-cols-3'>
        <Button
          type='button'
          className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
          onClick={() =>
            addMapping(`field_${entries.length + 1}`, '')
          }
        >
          Add mapping
        </Button>
        <Button
          type='button'
          className='w-full rounded-md border text-xs text-gray-200 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={entries.length === 0}
          onClick={() => removeMapping(entries.length - 1)}
        >
          Remove last
        </Button>
        <Button
          type='button'
          className='w-full rounded-md border border-rose-400/50 text-xs text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={entries.length === 0}
          onClick={() => commitMappingsImmediate({}, outputMode, 'custom')}
        >
          Clear mappings
        </Button>
      </div>
      {imageEntryIndex >= 0 && (
        <div className='rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-400'>
          <div className='text-gray-300'>Image helpers</div>
          <div className='mt-2 flex flex-wrap gap-2'>
            <Button
              type='button'
              className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() =>
                updateMappingPath(imageEntryIndex, '$.images')
              }
            >
              Use $.images
            </Button>
            <Button
              type='button'
              className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() =>
                updateMappingPath(imageEntryIndex, '$.imageLinks')
              }
            >
              Use $.imageLinks
            </Button>
            <Button
              type='button'
              className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() =>
                updateMappingPath(imageEntryIndex, '$.media')
              }
            >
                            Use $.media
            </Button>
          </div>
        </div>
      )}
      <p className='text-[11px] text-gray-500'>        Use JSON paths like{' '}
        <span className='text-gray-300'>{'$.images'}</span>,{' '}
        <span className='text-gray-300'>{'$.imageLinks'}</span>, or{' '}
        <span className='text-gray-300'>{'$.media'}</span> for image arrays.
      </p>
    </div>
  );
            
}
