"use client";



import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";
import { TRIGGER_EVENTS } from "@/features/ai-paths/lib";

type TriggerNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function TriggerNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: TriggerNodeConfigSectionProps) {
  if (selectedNode.type !== "trigger") return null;

  const triggerConfig = selectedNode.config?.trigger ?? {
    event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Trigger Action</Label>
        <Select
          value={triggerConfig.event}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              trigger: { event: value },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            {TRIGGER_EVENTS.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
