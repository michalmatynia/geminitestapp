"use client";





import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, CompareConfig, NodeConfig } from "@/features/ai-paths/lib";

type CompareNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function CompareNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: CompareNodeConfigSectionProps) {
  if (selectedNode.type !== "compare") return null;

  const compareConfig = selectedNode.config?.compare ?? {
    operator: "eq",
    compareTo: "",
    caseSensitive: false,
    message: "Comparison failed",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Operator</Label>
        <Select
          value={compareConfig.operator}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                operator: value as CompareConfig["operator"],
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select operator" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            <SelectItem value="eq">Equals</SelectItem>
            <SelectItem value="neq">Not equals</SelectItem>
            <SelectItem value="gt">Greater than</SelectItem>
            <SelectItem value="gte">Greater or equal</SelectItem>
            <SelectItem value="lt">Less than</SelectItem>
            <SelectItem value="lte">Less or equal</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="startsWith">Starts with</SelectItem>
            <SelectItem value="endsWith">Ends with</SelectItem>
            <SelectItem value="isEmpty">Is empty</SelectItem>
            <SelectItem value="notEmpty">Not empty</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Compare To</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={compareConfig.compareTo}
          onChange={(event) =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                compareTo: event.target.value,
              },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300">
        <span>Case Sensitive</span>
        <Button
          type="button"
          className={`rounded border px-3 py-1 text-xs ${
            compareConfig.caseSensitive
              ? "text-emerald-200 hover:bg-emerald-500/10"
              : "text-gray-300 hover:bg-muted/50"
          }`}
          onClick={() =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                caseSensitive: !compareConfig.caseSensitive,
              },
            })
          }
        >
          {compareConfig.caseSensitive ? "Enabled" : "Disabled"}
        </Button>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Error Message</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={compareConfig.message ?? "Comparison failed"}
          onChange={(event) =>
            updateSelectedNodeConfig({
              compare: {
                ...compareConfig,
                message: event.target.value,
              },
            })
          }
        />
      </div>
    </div>
  );
}
