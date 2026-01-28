"use client";





import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, NodeConfig } from "@/features/ai-paths/lib";

type SimulationNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  handleRunSimulation: (node: AiNode) => void;
};

export function SimulationNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
  handleRunSimulation,
}: SimulationNodeConfigSectionProps) {
  if (selectedNode.type !== "simulation") return null;

  const simulationConfig = selectedNode.config?.simulation ?? {
    productId: "",
    entityType: "product",
    entityId: "",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Entity Type</Label>
        <Select
          value={simulationConfig.entityType ?? "product"}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              simulation: {
                ...simulationConfig,
                entityType: value,
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
            <SelectValue placeholder="Select entity" />
          </SelectTrigger>
          <SelectContent className="border-border bg-gray-900">
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="log">Log Entry</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">
          {simulationConfig.entityType === "product"
            ? "Product ID"
            : "Entity ID"}
        </Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={simulationConfig.entityId ?? simulationConfig.productId}
          onChange={(event) =>
            updateSelectedNodeConfig({
              simulation: {
                ...simulationConfig,
                entityId: event.target.value,
                productId: event.target.value,
              },
            })
          }
        />
      </div>
      <p className="text-[11px] text-gray-500">
        Used to simulate {simulationConfig.entityType ?? "product"} context.
      </p>
      <Button
        className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
        type="button"
        onClick={() => handleRunSimulation(selectedNode)}
      >
        Run Simulation
      </Button>
    </div>
  );
}
