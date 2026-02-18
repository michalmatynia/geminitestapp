'use client';

import { createParserMappings, formatRuntimeValue, getValueAtMappingPath, parsePathList } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Input, Label, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

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
  const {
    selectedNode,
    runtimeState,
    updateSelectedNode,
    updateSelectedNodeConfig,
  } = useAiPathConfig();

  if (selectedNode?.type !== 'mapper') return null;

  const mapperConfig = selectedNode.config?.mapper ?? {
    outputs: selectedNode.outputs.length ? selectedNode.outputs : ['value'],
    mappings: createParserMappings(
      selectedNode.outputs.length ? selectedNode.outputs : ['value']
    ),
  };
  const outputs = mapperConfig.outputs.length
    ? mapperConfig.outputs
    : selectedNode.outputs.length
      ? selectedNode.outputs
      : ['value'];
  const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
  const mapperSources = buildMapperSources(runtimeInputs as Record<string, unknown>);
  const contextInput = getMapperContextValue(mapperSources);
  const preview = contextInput !== null && contextInput !== undefined
    ? buildLivePreview(mapperSources, outputs, mapperConfig.mappings)
    : null;
  const livePreview = preview?.values ?? null;
  const hasLivePreview = livePreview !== null && Object.keys(livePreview).length > 0;

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border bg-card/50 p-3'>
        <div className='text-[11px] text-gray-400'>Live Preview</div>
        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>
          <div>
            <Label className='text-xs text-gray-400'>Context Input</Label>
            <Textarea
              className='mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
              value={contextInput !== null && contextInput !== undefined ? formatRuntimeValue(contextInput) : ''}
              readOnly
              placeholder='Run the path or simulation to see the latest context input.'
            />
          </div>
          <div>
            <Label className='text-xs text-gray-400'>Mapped Output (Current Mappings)</Label>
            <Textarea
              className='mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
              value={hasLivePreview ? formatRuntimeValue(livePreview) : ''}
              readOnly
              placeholder={
                contextInput === null || contextInput === undefined
                  ? 'Run the path or simulation to see a live preview.'
                  : 'No mapped output yet.'
              }
            />
          </div>
        </div>
      </div>
      <div>
        <Label className='text-xs text-gray-400'>
          Outputs (one per line)
        </Label>
        <Textarea
          className='mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
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
                },
              },
            });
          }}
        />
        <p className='mt-2 text-[11px] text-gray-500'>
          Outputs must match downstream input ports exactly.
        </p>
      </div>
      {outputs.map((output: string): React.JSX.Element => (
        <div key={output}>
          <Label className='text-xs text-gray-400'>
            {formatPortLabel(output)} Mapping Path
          </Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={mapperConfig.mappings?.[output] ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const nextMappings = {
                ...mapperConfig.mappings,
                [output]: event.target.value,
              };
              updateSelectedNodeConfig({
                mapper: { outputs, mappings: nextMappings },
              });
            }}
          />
          {preview?.unresolved[output] ? (
            <p className='mt-1 text-[11px] text-amber-300'>
              Unresolved for current input: <code>{preview.unresolved[output]}</code>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
