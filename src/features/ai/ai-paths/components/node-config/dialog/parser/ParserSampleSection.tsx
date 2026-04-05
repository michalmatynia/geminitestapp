'use client';

import React from 'react';

import type { IdLabelOptionDto, LabeledOptionDto } from '@/shared/contracts/base';
import type { ParserSampleState } from '@/shared/lib/ai-paths';
import { Button, Input, Textarea } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';

export interface ParserSampleSectionProps {
  selectedNodeId: string;
  sampleState: ParserSampleState;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  simulationOptions: Array<IdLabelOptionDto & { entityId: string; entityType: string }>;
  parserSampleLoading: boolean;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  parsedSampleError: string | null;
  sampleMappingsLength: number;
  applySampleMappings: (mode: 'replace' | 'merge') => void;
  handleDetectImages: () => void;
}

const SAMPLE_ENTITY_TYPE_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'note', label: 'Note' },
  { value: 'custom', label: 'Custom' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'product' | 'note' | 'custom'>>;

const SAMPLE_MAPPING_MODE_OPTIONS = [
  { value: 'top', label: 'Top-level fields' },
  { value: 'flatten', label: 'Flatten nested' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'top' | 'flatten'>>;

const SAMPLE_DEPTH_OPTIONS = [1, 2, 3, 4].map((depth) => ({
  value: String(depth),
  label: `Depth ${depth}`,
})) as ReadonlyArray<LabeledOptionDto<string>>;

const SAMPLE_KEY_STYLE_OPTIONS = [
  { value: 'path', label: 'Path keys' },
  { value: 'leaf', label: 'Leaf keys' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'path' | 'leaf'>>;

export function ParserSampleSection(props: ParserSampleSectionProps): React.JSX.Element {
  const {
    selectedNodeId,
    sampleState,
    setParserSamples,
    simulationOptions,
    parserSampleLoading,
    handleFetchParserSample,
    parsedSampleError,
    sampleMappingsLength,
    applySampleMappings,
    handleDetectImages,
  } = props;
  const simulationSelectOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> =>
      simulationOptions.map((opt) => ({ value: opt.id, label: opt.label })),
    [simulationOptions]
  );

  return (
    <FormField label='Sample JSON'>
      <div className='grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center'>
        <SelectSimple
          size='sm'
          value={sampleState.entityType}
          onValueChange={(value: string) =>
            setParserSamples((prev) => ({
              ...prev,
              [selectedNodeId]: {
                ...sampleState,
                entityType: value,
              },
            }))
          }
          options={SAMPLE_ENTITY_TYPE_OPTIONS}
          placeholder='Entity type'
          variant='subtle'
         ariaLabel='Entity type' title='Entity type'/>
        <div className='space-y-2'>
          <Input
            variant='subtle'
            size='sm'
            value={sampleState.entityId}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setParserSamples((prev) => ({
                ...prev,
                [selectedNodeId]: {
                  ...sampleState,
                  entityId: event.target.value,
                  simulationId: '',
                },
              }))
            }
            placeholder='Entity ID'
           aria-label='Entity ID' title='Entity ID'/>
          {simulationOptions.length > 0 && (
            <SelectSimple
              size='sm'
              value={sampleState.simulationId ?? ''}
              onValueChange={(value: string) => {
                const option = simulationOptions.find((item) => item.id === value);
                if (!option) return;
                setParserSamples((prev) => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    entityType: option.entityType,
                    entityId: option.entityId,
                    simulationId: option.id,
                  },
                }));
              }}
              options={simulationSelectOptions}
              placeholder='Use simulation ID'
              variant='subtle'
              triggerClassName='h-8 text-[10px]'
             ariaLabel='Use simulation ID' title='Use simulation ID'/>
          )}
        </div>
        <Button
          type='button'
          variant='outline'
          className='h-8 text-[10px]'
          disabled={parserSampleLoading}
          onClick={() =>
            void handleFetchParserSample(
              selectedNodeId,
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
          setParserSamples((prev) => ({
            ...prev,
            [selectedNodeId]: {
              ...sampleState,
              json: event.target.value,
            },
          }))
        }
        placeholder='{ "id": "123", "title": "Sample" }'
        aria-label='{ "id": "123", "title": "Sample" }'
        title='{ "id": "123", "title": "Sample" }'
      />
      <div className='mt-2 flex flex-wrap gap-2'>
        <SelectSimple
          size='sm'
          value={sampleState.mappingMode}
          onValueChange={(value: string) =>
            setParserSamples((prev) => ({
              ...prev,
              [selectedNodeId]: {
                ...sampleState,
                mappingMode: value as 'top' | 'flatten',
              },
            }))
          }
          options={SAMPLE_MAPPING_MODE_OPTIONS}
          className='w-[180px]'
         ariaLabel='Sample JSON' title='Sample JSON'/>
        <SelectSimple
          size='sm'
          value={String(sampleState.depth)}
          onValueChange={(value: string) =>
            setParserSamples((prev) => ({
              ...prev,
              [selectedNodeId]: {
                ...sampleState,
                depth: Number(value),
              },
            }))
          }
          options={SAMPLE_DEPTH_OPTIONS}
          className='w-[160px]'
         ariaLabel='Sample JSON' title='Sample JSON'/>
        <Button
          type='button'
          className={`rounded-md border px-3 text-[10px] ${
            sampleState.includeContainers
              ? 'text-emerald-200 hover:bg-emerald-500/10'
              : 'text-gray-300 hover:bg-muted/60'
          }`}
          onClick={() =>
            setParserSamples((prev) => ({
              ...prev,
              [selectedNodeId]: {
                ...sampleState,
                includeContainers: !sampleState.includeContainers,
              },
            }))
          }
        >
          {sampleState.includeContainers ? 'Containers: On' : 'Containers: Off'}
        </Button>
        {sampleState.mappingMode === 'flatten' && (
          <SelectSimple
            size='sm'
            value={sampleState.keyStyle}
            onValueChange={(value: string) =>
              setParserSamples((prev) => ({
                ...prev,
                [selectedNodeId]: {
                  ...sampleState,
                  keyStyle: value as 'path' | 'leaf',
                },
              }))
            }
            options={SAMPLE_KEY_STYLE_OPTIONS}
            className='w-[170px]'
           ariaLabel='Sample JSON' title='Sample JSON'/>
        )}
      </div>
      {parsedSampleError ? (
        <p className='mt-2 text-[11px] text-rose-300'>{parsedSampleError}</p>
      ) : null}
      <div className='mt-3 flex flex-wrap gap-2'>
        {sampleMappingsLength > 0 && (
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
  );
}
