"use client";

import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";
import { parsePathList } from "@/features/ai-paths/lib";

type BundleNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function BundleNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: BundleNodeConfigSectionProps) {
  if (selectedNode.type !== "bundle") return null;

  const bundleConfig = selectedNode.config?.bundle ?? {
    includePorts: [],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-400">
          Included Ports (one per line)
        </Label>
        <Button
          type="button"
          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
          onClick={() =>
            updateSelectedNodeConfig({
              bundle: { includePorts: selectedNode.inputs },
            })
          }
        >
          Use all inputs
        </Button>
      </div>
      <Textarea
        className="min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
        value={(bundleConfig.includePorts ?? []).join("\n")}
        onChange={(event) =>
          updateSelectedNodeConfig({
            bundle: { includePorts: parsePathList(event.target.value) },
          })
        }
      />
      <p className="text-[11px] text-gray-500">
        Bundle outputs a single object with the selected ports as keys.
      </p>
    </div>
  );
}
