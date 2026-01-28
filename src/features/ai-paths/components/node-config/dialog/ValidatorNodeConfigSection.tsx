"use client";




import { Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";
import { parsePathList } from "@/features/ai-paths/lib";

type ValidatorNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function ValidatorNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: ValidatorNodeConfigSectionProps) {
  if (selectedNode.type !== "validator") return null;

  const validatorConfig = selectedNode.config?.validator ?? {
    requiredPaths: ["entity.id"],
    mode: "all",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Validation Mode</Label>
        <Select
          value={validatorConfig.mode}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              validator: {
                ...validatorConfig,
                mode: value as "all" | "any",
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            <SelectItem value="all">All paths required</SelectItem>
            <SelectItem value="any">Any path required</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">
          Required Paths (one per line)
        </Label>
        <Textarea
          className="mt-2 min-h-[100px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={(validatorConfig.requiredPaths ?? []).join("\n")}
          onChange={(event) =>
            updateSelectedNodeConfig({
              validator: {
                ...validatorConfig,
                requiredPaths: parsePathList(event.target.value),
              },
            })
          }
        />
        <p className="mt-2 text-[11px] text-gray-500">
          Paths are relative to the incoming context object.
        </p>
      </div>
    </div>
  );
}
