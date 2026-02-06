'use client';




import type { AiNode, NodeConfig, RuntimeState } from '@/features/ai/ai-paths/lib';
import { createParserMappings, formatRuntimeValue, getValueAtMappingPath, parsePathList } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import { Input, Label, Textarea } from '@/shared/ui';

type MapperNodeConfigSectionProps = {
  selectedNode: AiNode;
  runtimeState: RuntimeState;
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

const buildLivePreview = (
  contextValue: unknown,
  outputs: string[],
  mappings?: Record<string, string>
): Record<string, unknown> => {
  if (contextValue === null || contextValue === undefined) return {};
  return outputs.reduce<Record<string, unknown>>((acc, output: string) => {
    const mapping = mappings?.[output]?.trim() ?? '';
    const value = mapping
      ? getValueAtMappingPath(contextValue, mapping)
      : output === 'value'
        ? contextValue
        : getValueAtMappingPath(contextValue, output);
    if (value !== undefined) {
      acc[output] = value;
    }
    return acc;
  }, {});
};

export function MapperNodeConfigSection({
  selectedNode,
  runtimeState,
  updateSelectedNode,
  updateSelectedNodeConfig,
}: MapperNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== 'mapper') return null;

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
  const contextInput =
    runtimeInputs.context ??
    runtimeInputs.result ??
    runtimeInputs.bundle ??
    runtimeInputs.value ??
    null;
  const livePreview = contextInput !== null
    ? buildLivePreview(contextInput, outputs, mapperConfig.mappings)
    : null;
  const hasLivePreview = livePreview !== null && Object.keys(livePreview).length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card/50 p-3">
        <div className="text-[11px] text-gray-400">Live Preview</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-gray-400">Context Input</Label>
            <Textarea
              className="mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white"
              value={contextInput !== null ? formatRuntimeValue(contextInput) : ''}
              readOnly
              placeholder="Run the path or simulation to see the latest context input."
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Mapped Output (Current Mappings)</Label>
            <Textarea
              className="mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white"
              value={hasLivePreview ? formatRuntimeValue(livePreview) : ''}
              readOnly
              placeholder={
                contextInput === null
                  ? 'Run the path or simulation to see a live preview.'
                  : 'No mapped output yet.'
              }
            />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-400">
          Outputs (one per line)
        </Label>
        <Textarea
          className="mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
        <p className="mt-2 text-[11px] text-gray-500">
          Outputs must match downstream input ports exactly.
        </p>
      </div>
      {outputs.map((output: string): React.JSX.Element => (
        <div key={output}>
          <Label className="text-xs text-gray-400">
            {formatPortLabel(output)} Mapping Path
          </Label>
          <Input
            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
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
        </div>
      ))}
    </div>
  );
}
