"use client";
import type { AiNode, RuntimeState } from "@/features/ai-paths/lib";
import { RunHistoryEntries } from "@/features/ai-paths/components/RunHistoryEntries";

type NodeHistoryTabProps = {
  selectedNode: AiNode;
  runtimeState: RuntimeState;
};

export function NodeHistoryTab({
  selectedNode,
  runtimeState,
}: NodeHistoryTabProps): React.JSX.Element {
  const history = (runtimeState.history?.[selectedNode.id] ?? []);
  return (
    <RunHistoryEntries
      entries={history}
      emptyMessage="No history yet. Run the path to capture inputs/outputs for this node."
    />
  );
}
