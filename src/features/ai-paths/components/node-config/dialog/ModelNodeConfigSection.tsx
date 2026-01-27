"use client";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AiNode, ModelConfig, NodeConfig } from "@/features/ai-paths/lib";
import { DEFAULT_MODELS, toNumber } from "@/features/ai-paths/lib";

type ModelNodeConfigSectionProps = {
  selectedNode: AiNode;
  modelOptions: string[];
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function ModelNodeConfigSection({
  selectedNode,
  modelOptions,
  updateSelectedNodeConfig,
}: ModelNodeConfigSectionProps) {
  if (selectedNode.type !== "model") return null;

  const modelConfig: ModelConfig = selectedNode.config?.model ?? {
    modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
    temperature: 0.7,
    maxTokens: 800,
    vision: selectedNode.inputs.includes("images"),
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Model</Label>
        <Select
          value={modelConfig.modelId}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              model: { ...modelConfig, modelId: value },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="border-gray-800 bg-gray-900">
            {modelOptions.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-gray-400">Temperature</Label>
          <Input
            type="number"
            step="0.1"
            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
            value={modelConfig.temperature}
            onChange={(event) =>
              updateSelectedNodeConfig({
                model: {
                  ...modelConfig,
                  temperature: toNumber(
                    event.target.value,
                    modelConfig.temperature
                  ),
                },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Max Tokens</Label>
          <Input
            type="number"
            step="50"
            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
            value={modelConfig.maxTokens}
            onChange={(event) =>
              updateSelectedNodeConfig({
                model: {
                  ...modelConfig,
                  maxTokens: toNumber(
                    event.target.value,
                    modelConfig.maxTokens
                  ),
                },
              })
            }
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
        <span>Accepts Images</span>
        <Button
          type="button"
          className={`rounded border border-gray-700 px-3 py-1 text-xs ${
            modelConfig.vision
              ? "text-emerald-200 hover:bg-emerald-500/10"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          onClick={() =>
            updateSelectedNodeConfig({
              model: { ...modelConfig, vision: !modelConfig.vision },
            })
          }
        >
          {modelConfig.vision ? "Enabled" : "Disabled"}
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
        <span>Wait for result</span>
        <Button
          type="button"
          className={`rounded border border-gray-700 px-3 py-1 text-xs ${
            modelConfig.waitForResult !== false
              ? "text-emerald-200 hover:bg-emerald-500/10"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          onClick={() =>
            updateSelectedNodeConfig({
              model: {
                ...modelConfig,
                waitForResult: modelConfig.waitForResult === false,
              },
            })
          }
        >
          {modelConfig.waitForResult === false ? "Disabled" : "Enabled"}
        </Button>
      </div>
      <p className="text-[11px] text-gray-500">
        When enabled, the Model node polls the job until completion and emits
        <span className="text-gray-300"> result</span>. Disable to emit only{" "}
        <span className="text-gray-300">jobId</span> and use a Poll node.
      </p>
    </div>
  );
}
