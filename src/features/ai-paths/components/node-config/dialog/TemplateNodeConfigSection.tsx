"use client";



import { Label, Textarea } from "@/shared/ui";
import type { AiNode, NodeConfig, TemplateConfig } from "@/features/ai-paths/lib";

type TemplateNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function TemplateNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: TemplateNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== "template") return null;

  const templateConfig: TemplateConfig = selectedNode.config?.template ?? {
    template: "",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Template</Label>
        <Textarea
          className="mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={templateConfig.template}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              template: { template: event.target.value },
            })
          }
        />
        <p className="mt-2 text-[11px] text-gray-500">
          Use placeholders like{" "}
          <span className="text-gray-300">{`{{context.entity.title}}`}</span> or{" "}
          <span className="text-gray-300">{`{{result}}`}</span>.
        </p>
      </div>
    </div>
  );
}
