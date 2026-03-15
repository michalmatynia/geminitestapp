'use client';

import React from 'react';

import type { ParserSampleState } from '@/shared/lib/ai-paths';
import { Button, FormField, Input, SelectSimple, Textarea } from '@/shared/ui';

export interface ParserSampleSectionProps {
  selectedNodeId: string;
  sampleState: ParserSampleState;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  simulationOptions: Array<{ id: string; label: string; entityId: string; entityType: string }>;
  parserSampleLoading: boolean;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  parsedSampleError: string | null;
  sampleMappingsLength: number;
  applySampleMappings: (mode: 'replace' | 'merge') => void;
  handleDetectImages: () => void;
}

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
          options={[
            { value: 'product', label: 'Product' },
            { value: 'note', label: 'Note' },
            { value: 'custom', label: 'Custom' },
          ]}
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
              options={simulationOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
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
          options={[
            { value: 'top', label: 'Top-level fields' },
            { value: 'flatten', label: 'Flatten nested' },
          ]}
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
          options={[1, 2, 3, 4].map((d) => ({ value: String(d), label: `Depth ${d}` }))}
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
            options={[
              { value: 'path', label: 'Path keys' },
              { value: 'leaf', label: 'Leaf keys' },
            ]}
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
