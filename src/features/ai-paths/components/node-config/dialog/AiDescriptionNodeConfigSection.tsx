"use client";

import { Button } from "@/shared/ui/button";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";

type AiDescriptionNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function AiDescriptionNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: AiDescriptionNodeConfigSectionProps) {
  if (selectedNode.type !== "ai_description") return null;

  const descriptionConfig = selectedNode.config?.description ?? {
    visionOutputEnabled: true,
    generationOutputEnabled: true,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
        <span>Include vision analysis</span>
        <Button
          type="button"
          className={`rounded border border-gray-700 px-3 py-1 text-xs ${
            descriptionConfig.visionOutputEnabled
              ? "text-emerald-200 hover:bg-emerald-500/10"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          onClick={() =>
            updateSelectedNodeConfig({
              description: {
                ...descriptionConfig,
                visionOutputEnabled: !descriptionConfig.visionOutputEnabled,
              },
            })
          }
        >
          {descriptionConfig.visionOutputEnabled ? "Enabled" : "Disabled"}
        </Button>
      </div>
      <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
        <span>Include generation output</span>
        <Button
          type="button"
          className={`rounded border border-gray-700 px-3 py-1 text-xs ${
            descriptionConfig.generationOutputEnabled
              ? "text-emerald-200 hover:bg-emerald-500/10"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          onClick={() =>
            updateSelectedNodeConfig({
              description: {
                ...descriptionConfig,
                generationOutputEnabled: !descriptionConfig.generationOutputEnabled,
              },
            })
          }
        >
          {descriptionConfig.generationOutputEnabled ? "Enabled" : "Disabled"}
        </Button>
      </div>
    </div>
  );
}
