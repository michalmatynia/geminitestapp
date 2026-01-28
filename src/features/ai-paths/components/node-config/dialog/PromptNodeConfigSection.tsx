"use client";




import { Button, Label, Textarea } from "@/shared/ui";
import type { AiNode, Edge, NodeConfig, PromptConfig, RuntimeState } from "@/features/ai-paths/lib";
import { createParserMappings, formatRuntimeValue } from "@/features/ai-paths/lib";
import { formatPlaceholderLabel } from "@/features/ai-paths/utils/ui-utils";

type PromptNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  onSendToAi?: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi?: boolean;
};

export function PromptNodeConfigSection({
  selectedNode,
  nodes,
  edges,
  runtimeState,
  updateSelectedNodeConfig,
  onSendToAi,
  sendingToAi,
}: PromptNodeConfigSectionProps) {
  if (selectedNode.type !== "prompt") return null;

  const promptConfig: PromptConfig = selectedNode.config?.prompt ?? {
    template: "",
  };
  const handleInsertPlaceholder = (placeholder: string) => {
    const current = promptConfig.template ?? "";
    const separator = current && !current.endsWith(" ") && !current.endsWith("\n") ? " " : "";
    const next = `${current}${separator}${placeholder}`;
    updateSelectedNodeConfig({ prompt: { template: next } });
  };
  const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
  const inputPorts = incomingEdges
    .map((edge) => edge.toPort)
    .filter((port): port is string => Boolean(port));
  const bundleKeys = new Set<string>();
  incomingEdges.forEach((edge) => {
    if (edge.toPort !== "bundle") return;
    const fromNode = nodes.find((node) => node.id === edge.from);
    if (!fromNode) return;
    if (fromNode.type === "parser") {
      const mappings =
        fromNode.config?.parser?.mappings ??
        createParserMappings(fromNode.outputs);
      Object.keys(mappings).forEach((key) => {
        const trimmed = key.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
      return;
    }
    if (fromNode.type === "bundle") {
      fromNode.inputs.forEach((port) => {
        const trimmed = port.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
    if (fromNode.type === "mapper") {
      const mapperOutputs =
        fromNode.config?.mapper?.outputs ?? fromNode.outputs;
      mapperOutputs.forEach((output) => {
        const trimmed = output.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
  });
  const directPlaceholders = inputPorts.filter((port) => port !== "bundle");

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Prompt Template</Label>
        <Textarea
          className="mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={promptConfig.template}
          onChange={(event) =>
            updateSelectedNodeConfig({
              prompt: { template: event.target.value },
            })
          }
          placeholder="Describe the product: {{title}}"
        />
        <p className="mt-2 text-[11px] text-gray-500">
          Images are passed separately via the Prompt{" "}
          <span className="text-gray-300">images</span> output and the Model{" "}
          <span className="text-gray-300">images</span> input. You don&apos;t
          need an <span className="text-gray-300">images</span> placeholder
          inside the prompt text.
        </p>
      </div>
      <div className="rounded-md border border-border bg-card/50 p-3 text-[11px] text-gray-400">
        <div className="text-gray-300">Available placeholders</div>
        {bundleKeys.size > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(bundleKeys).map((key) => (
              <span
                key={key}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-full border px-2 py-0.5 text-[10px] text-gray-200 transition hover:border-gray-500 hover:bg-muted/50"
                onClick={() => handleInsertPlaceholder(`{{${key}}}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleInsertPlaceholder(`{{${key}}}`);
                  }
                }}
              >
                {formatPlaceholderLabel(key)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-gray-500">
            Connect a Parser or Bundle node to the bundle input to surface
            placeholder hints.
          </div>
        )}
        {directPlaceholders.length > 0 && (
          <div className="mt-3 text-[11px] text-gray-500">
            Direct inputs:{" "}
            {directPlaceholders
              .map((port) => formatPlaceholderLabel(port))
              .join(", ")}
          </div>
        )}
      </div>
      {(() => {
        const outgoingEdges = edges.filter(
          (edge) => edge.from === selectedNode.id
        );
        const aiEdge = outgoingEdges.find((edge) => {
          const targetNode = nodes.find((n) => n.id === edge.to);
          return targetNode?.type === "model";
        });
        const aiNode = aiEdge
          ? nodes.find((n) => n.id === aiEdge.to && n.type === "model")
          : null;
        const aiModelId = aiNode?.config?.model?.modelId;
        const hasPromptContent = promptConfig.template && promptConfig.template.trim().length > 0;

        return (
          <div className="mt-4 space-y-2">
            {aiNode ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  <span className="text-[11px] text-emerald-100">
                    Connected to AI Model:{" "}
                    <span className="font-medium text-emerald-200">{aiModelId || "Unknown"}</span>
                  </span>
                </div>
                {onSendToAi && hasPromptContent && (
                  <Button
                    type="button"
                    className="mt-2 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                    disabled={sendingToAi}
                    onClick={() => {
                      if (selectedNode?.id && promptConfig.template) {
                        void onSendToAi(selectedNode.id, promptConfig.template);
                      }
                    }}
                  >
                    {sendingToAi ? "Sending..." : "Send to AI Model"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                  <span className="text-[11px] text-amber-100">
                    Not connected to AI Model
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-gray-500">
              Connect this node&apos;s <span className="text-gray-300">prompt</span> output to an AI Model node to enable direct sending.
            </p>
          </div>
        );
      })()}
      {(() => {
        const resultValue = runtimeState.inputs[selectedNode.id]?.result
          ?? runtimeState.outputs[selectedNode.id]?.result;
        const hasResult = resultValue !== undefined && resultValue !== null;
        const displayValue = hasResult
          ? (typeof resultValue === "string"
              ? resultValue
              : formatRuntimeValue(resultValue))
          : "";

        return (
          <div className="mt-4">
            <Label className="text-xs text-gray-400">Result Input</Label>
            <Textarea
              className="mt-2 min-h-[100px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={displayValue}
              readOnly
              placeholder="No result received yet. Connect a node to the result input and run the graph."
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Shows the value passed through the <span className="text-gray-300">result</span> input port.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
