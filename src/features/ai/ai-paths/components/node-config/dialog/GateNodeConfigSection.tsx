'use client';




import type { AiNode, GateConfig, NodeConfig } from '@/features/ai/ai-paths/lib';
import { Input, Label, UnifiedSelect } from '@/shared/ui';

type GateNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function GateNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: GateNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== 'gate') return null;

  const gateConfig: GateConfig = selectedNode.config?.gate ?? {
    mode: 'block',
    failMessage: 'Gate blocked',
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Mode</Label>
        <UnifiedSelect
          value={gateConfig.mode}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              gate: {
                ...gateConfig,
                mode: value as GateConfig['mode'],
              },
            })
          }
          options={[
            { value: 'block', label: 'Block on invalid' },
            { value: 'pass', label: 'Pass-through' }
          ]}
          placeholder="Select mode"
          triggerClassName="mt-2 w-full border-border bg-card/70 text-sm text-white"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Fail Message</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={gateConfig.failMessage ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              gate: { ...gateConfig, failMessage: event.target.value },
            })
          }
        />
      </div>
    </div>
  );
}
