"use client";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";
import { toNumber } from "@/features/ai-paths/lib";

type DelayNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function DelayNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: DelayNodeConfigSectionProps) {
  if (selectedNode.type !== "delay") return null;

  const delayConfig = selectedNode.config?.delay ?? { ms: 300 };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Delay (ms)</Label>
        <Input
          type="number"
          step="50"
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={delayConfig.ms}
          onChange={(event) =>
            updateSelectedNodeConfig({
              delay: {
                ms: toNumber(event.target.value, delayConfig.ms),
              },
            })
          }
        />
      </div>
      <p className="text-[11px] text-gray-500">
        Adds a pause before passing inputs downstream.
      </p>
    </div>
  );
}
