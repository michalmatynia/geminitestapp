"use client";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AiNode, NodeConfig, RouterConfig } from "@/features/ai-paths/lib";

type RouterNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function RouterNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: RouterNodeConfigSectionProps) {
  if (selectedNode.type !== "router") return null;

  const routerConfig = selectedNode.config?.router ?? {
    mode: "valid",
    matchMode: "truthy",
    compareTo: "",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Match Source</Label>
        <Select
          value={routerConfig.mode}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                mode: value as RouterConfig["mode"],
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent className="border-gray-800 bg-gray-900">
            <SelectItem value="valid">Validator valid</SelectItem>
            <SelectItem value="value">Value input</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Match Mode</Label>
        <Select
          value={routerConfig.matchMode}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                matchMode: value as RouterConfig["matchMode"],
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
            <SelectValue placeholder="Select match mode" />
          </SelectTrigger>
          <SelectContent className="border-gray-800 bg-gray-900">
            <SelectItem value="truthy">Truthy</SelectItem>
            <SelectItem value="falsy">Falsy</SelectItem>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Compare To</Label>
        <Input
          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
          value={routerConfig.compareTo}
          onChange={(event) =>
            updateSelectedNodeConfig({
              router: {
                ...routerConfig,
                compareTo: event.target.value,
              },
            })
          }
        />
      </div>
    </div>
  );
}
