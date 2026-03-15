'use client';

import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import {
  createParserMappings,
  formatRuntimeValue,
  getValueAtMappingPath,
  parsePathList,
} from '@/shared/lib/ai-paths';
import { Input, SelectSimple, Textarea, FormField } from '@/shared/ui';

import {
  useAiPathOrchestrator,
  useAiPathRuntime,
  useAiPathSelection,
} from '../../AiPathConfigContext';

type MapperSources = {
  context: unknown;
  result: unknown;
  bundle: unknown;
  value: unknown;
};

type MapperPreview = {
  values: Record<string, unknown>;
  unresolved: Record<string, string>;
};

const SOURCE_PATH_PATTERN = /^(context|result|bundle|value)(?:\.|\[|$)/;

const buildMapperSources = (runtimeInputs: Record<string, unknown>): MapperSources => ({
  context: runtimeInputs['context'] ?? null,
  result: runtimeInputs['result'] ?? null,
  bundle: runtimeInputs['bundle'] ?? null,
  value: runtimeInputs['value'] ?? null,
});

const getMapperContextValue = (sources: MapperSources): unknown =>
  sources.context ?? sources.result ?? sources.bundle ?? sources.value;

const resolveMapperValue = (
  sources: MapperSources,
  contextValue: unknown,
  path: string
): unknown => {
  if (!path) return undefined;
  if (SOURCE_PATH_PATTERN.test(path)) {
    return getValueAtMappingPath(sources, path);
  }
  const fromContext = getValueAtMappingPath(contextValue, path);
  if (fromContext !== undefined) return fromContext;
  return getValueAtMappingPath(sources, path);
};

const buildLivePreview = (
  sources: MapperSources,
  outputs: string[],
  mappings?: Record<string, string>
): MapperPreview => {
  const contextValue = getMapperContextValue(sources);
  if (contextValue === null || contextValue === undefined) {
    return { values: {}, unresolved: {} };
  }
  const values: Record<string, unknown> = {};
  const unresolved: Record<string, string> = {};
  outputs.forEach((output: string): void => {
    const mapping = mappings?.[output]?.trim() ?? '';
    const value = mapping
      ? resolveMapperValue(sources, contextValue, mapping)
      : output === 'value'
        ? contextValue
        : resolveMapperValue(sources, contextValue, output);
    if (value !== undefined) {
      values[output] = value;
    } else if (mapping) {
      unresolved[output] = mapping;
    }
  });
  return { values, unresolved };
};

export function MapperNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { runtimeState } = useAiPathRuntime();
  const { updateSelectedNode, updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'mapper') return null;

  const mapperConfig = selectedNode.config?.mapper ?? {
    outputs: (selectedNode.outputs ?? []).length ? selectedNode.outputs : ['value'],
    mappings: createParserMappings(
      (selectedNode.outputs ?? []).length ? selectedNode.outputs : ['value']
    ),
    jsonIntegrityPolicy: 'repair',
  };
  const outputs = (mapperConfig.outputs ?? []).length
    ? (mapperConfig.outputs ?? [])
    : (selectedNode.outputs ?? []).length
      ? selectedNode.outputs
      : ['value'];
  const runtimeInputs = runtimeState.inputs?.[selectedNode.id] ?? {};
  const mapperSources = buildMapperSources(runtimeInputs);
  const contextInput = getMapperContextValue(mapperSources);
  const preview =
    contextInput !== null && contextInput !== undefined
      ? buildLivePreview(mapperSources, outputs, mapperConfig.mappings)
      : null;
  const livePreview = preview?.values ?? null;
  const hasLivePreview = livePreview !== null && Object.keys(livePreview).length > 0;

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='text-[11px] text-gray-400 font-semibold mb-3 uppercase tracking-wider'>
          Live Preview
        </div>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <FormField label='Context Input'>
            <Textarea
              variant='subtle'
              size='sm'
              className='min-h-[110px] font-mono'
              value={
                contextInput !== null && contextInput !== undefined
                  ? formatRuntimeValue(contextInput)
                  : ''
              }
              readOnly
              placeholder='Run the path or simulation to see the latest context input.'
             aria-label='Run the path or simulation to see the latest context input.' title='Run the path or simulation to see the latest context input.'/>
          </FormField>
          <FormField label='Mapped Output'>
            <Textarea
              variant='subtle'
              size='sm'
              className='min-h-[110px] font-mono'
              value={hasLivePreview ? formatRuntimeValue(livePreview) : ''}
              readOnly
              placeholder={
                contextInput === null || contextInput === undefined
                  ? 'Run the path or simulation to see a live preview.'
                  : 'No mapped output yet.'
              }
             aria-label={contextInput === null || contextInput === undefined
                  ? 'Run the path or simulation to see a live preview.'
                  : 'No mapped output yet.'} title={contextInput === null || contextInput === undefined
                  ? 'Run the path or simulation to see a live preview.'
                  : 'No mapped output yet.'}/>
          </FormField>
        </div>
      </div>
      <FormField
        label='JSON Integrity Policy'
        description='Controls how string inputs are normalized before path mapping.'
      >
        <SelectSimple
          size='sm'
          variant='subtle'
          value={mapperConfig.jsonIntegrityPolicy ?? 'repair'}
          onValueChange={(value: string): void => {
            const jsonIntegrityPolicy = value === 'strict' ? 'strict' : 'repair';
            updateSelectedNodeConfig({
              mapper: {
                outputs,
                mappings: mapperConfig.mappings ?? createParserMappings(outputs),
                jsonIntegrityPolicy,
              },
            });
          }}
          placeholder='Select policy'
          options={[
            { value: 'strict', label: 'Strict (no repair)' },
            { value: 'repair', label: 'Repair malformed JSON' },
          ]}
         ariaLabel='Select policy' title='Select policy'/>
      </FormField>

      <FormField
        label='Outputs (one per line)'
        description='Outputs must match downstream input ports exactly.'
      >
        <Textarea
          variant='subtle'
          size='sm'
          className='min-h-[90px]'
          value={outputs.join('\n')}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            const list = parsePathList(event.target.value);
            const nextOutputs = list.length ? list : ['value'];
            const nextMappings = createParserMappings(nextOutputs);
            nextOutputs.forEach((output: string) => {
              if (mapperConfig.mappings?.[output]) {
                nextMappings[output] = mapperConfig.mappings[output];
              }
            });
            updateSelectedNode({
              outputs: nextOutputs,
              config: {
                ...selectedNode.config,
                mapper: {
                  outputs: nextOutputs,
                  mappings: nextMappings,
                  jsonIntegrityPolicy: mapperConfig.jsonIntegrityPolicy ?? 'repair',
                },
              },
            });
          }}
         aria-label='Outputs (one per line)' title='Outputs (one per line)'/>
      </FormField>
      <div className='space-y-3 pt-2 border-t border-border/20'>
        <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>
          Field Mappings
        </div>
        {outputs.map(
          (output: string): React.JSX.Element => (
            <FormField key={output} label={`${formatPortLabel(output)} Mapping Path`}>
              <Input
                variant='subtle'
                size='sm'
                value={mapperConfig.mappings?.[output] ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  const nextMappings = {
                    ...mapperConfig.mappings,
                    [output]: event.target.value,
                  };
                  updateSelectedNodeConfig({
                    mapper: {
                      outputs,
                      mappings: nextMappings,
                      jsonIntegrityPolicy: mapperConfig.jsonIntegrityPolicy ?? 'repair',
                    },
                  });
                }}
               aria-label={`${formatPortLabel(output)} Mapping Path`} title={`${formatPortLabel(output)} Mapping Path`}/>
              {preview?.unresolved[output] ? (
                <p className='mt-1 text-[10px] text-amber-400 font-mono'>
                  Unresolved: {preview.unresolved[output]}
                </p>
              ) : null}
            </FormField>
          )
        )}
      </div>
    </div>
  );
}
