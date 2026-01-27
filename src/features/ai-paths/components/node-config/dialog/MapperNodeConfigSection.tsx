"use client";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";
import { createParserMappings, parsePathList } from "@/features/ai-paths/lib";
import { formatPortLabel } from "@/features/ai-paths/utils/ui-utils";

type MapperNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNode: (patch: Partial<AiNode>) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function MapperNodeConfigSection({
  selectedNode,
  updateSelectedNode,
  updateSelectedNodeConfig,
}: MapperNodeConfigSectionProps) {
  if (selectedNode.type !== "mapper") return null;

  const mapperConfig = selectedNode.config?.mapper ?? {
    outputs: selectedNode.outputs.length ? selectedNode.outputs : ["value"],
    mappings: createParserMappings(
      selectedNode.outputs.length ? selectedNode.outputs : ["value"]
    ),
  };
  const outputs = mapperConfig.outputs.length
    ? mapperConfig.outputs
    : selectedNode.outputs.length
      ? selectedNode.outputs
      : ["value"];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">
          Outputs (one per line)
        </Label>
        <Textarea
          className="mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={outputs.join("\n")}
          onChange={(event) => {
            const list = parsePathList(event.target.value);
            const nextOutputs = list.length ? list : ["value"];
            const nextMappings = createParserMappings(nextOutputs);
            nextOutputs.forEach((output) => {
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
      {outputs.map((output) => (
        <div key={output}>
          <Label className="text-xs text-gray-400">
            {formatPortLabel(output)} Mapping Path
          </Label>
          <Input
            className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
            value={mapperConfig.mappings?.[output] ?? ""}
            onChange={(event) => {
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
