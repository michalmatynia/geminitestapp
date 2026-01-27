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
import type { AiNode, MathConfig, NodeConfig } from "@/features/ai-paths/lib";
import { toNumber } from "@/features/ai-paths/lib";

type MathNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function MathNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: MathNodeConfigSectionProps) {
  if (selectedNode.type !== "math") return null;

  const mathConfig = selectedNode.config?.math ?? {
    operation: "add",
    operand: 0,
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Operation</Label>
        <Select
          value={mathConfig.operation}
          onValueChange={(value) =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operation: value as MathConfig["operation"],
              },
            })
          }
        >
          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent className="border-gray-800 bg-gray-900">
            <SelectItem value="add">Add</SelectItem>
            <SelectItem value="subtract">Subtract</SelectItem>
            <SelectItem value="multiply">Multiply</SelectItem>
            <SelectItem value="divide">Divide</SelectItem>
            <SelectItem value="round">Round</SelectItem>
            <SelectItem value="ceil">Ceil</SelectItem>
            <SelectItem value="floor">Floor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Operand</Label>
        <Input
          type="number"
          step="0.1"
          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
          value={mathConfig.operand}
          onChange={(event) =>
            updateSelectedNodeConfig({
              math: {
                ...mathConfig,
                operand: toNumber(event.target.value, mathConfig.operand),
              },
            })
          }
        />
      </div>
    </div>
  );
}
