"use client";

import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, NodeCacheMode, NodeConfig } from "@/features/ai-paths/lib";
import { CACHEABLE_NODE_TYPES } from "@/features/ai-paths/lib";

type RuntimeNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function RuntimeNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: RuntimeNodeConfigSectionProps) {
  const runtimeConfig = selectedNode.config?.runtime ?? {};
  const cacheConfig = runtimeConfig.cache ?? {};
  const cacheMode: NodeCacheMode = cacheConfig.mode ?? "auto";
  const isAutoCacheable = CACHEABLE_NODE_TYPES.includes(selectedNode.type);

  return (
    <div className="space-y-3 rounded-md border border-border bg-card/50 p-3">
      <div>
        <Label className="text-xs text-gray-400">Execution cache</Label>
        <Select
          value={cacheMode}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              runtime: {
                ...runtimeConfig,
                cache: {
                  ...cacheConfig,
                  mode: value as NodeCacheMode,
                },
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Cache mode" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            <SelectItem value="auto">Auto (deterministic only)</SelectItem>
            <SelectItem value="force">Force cache</SelectItem>
            <SelectItem value="disabled">Disable cache</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-[11px] text-gray-500">
        Auto caches deterministic nodes. {isAutoCacheable ? "This node supports auto caching." : "Auto caching is off for this node type."}
      </p>
      <p className="text-[11px] text-gray-500">
        Force cache reuses outputs even for side-effect nodes (HTTP, DB writes, AI, delays, notifications).
      </p>
    </div>
  );
}
