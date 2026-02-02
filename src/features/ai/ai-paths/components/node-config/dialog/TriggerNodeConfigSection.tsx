"use client";



import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, NodeConfig } from "@/features/ai/ai-paths/lib";
import { TRIGGER_EVENTS } from "@/features/ai/ai-paths/lib";

type TriggerNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function TriggerNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: TriggerNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== "trigger") return null;

  const triggerConfig = selectedNode.config?.trigger ?? {
    event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
  };
  const isScheduled = triggerConfig.event === "scheduled_run";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Trigger Action</Label>
        <Select
          value={triggerConfig.event}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              trigger: { event: value },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            {TRIGGER_EVENTS.map((event: { id: string; label: string }): React.JSX.Element => (
              <SelectItem key={event.id} value={event.id}>
                {event.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isScheduled ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Server Schedule
          </div>
          <div className="mt-1 text-amber-100/80">
            This trigger runs from server schedules or cron. Context input is optional,
            and manual runs are allowed for testing.
          </div>
        </div>
      ) : null}
    </div>
  );
}
