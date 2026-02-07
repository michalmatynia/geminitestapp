'use client';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui';


type SimulationDialogProps = {
  openNodeId: string | null;
  onClose: () => void;
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  isPathLocked?: boolean;
  onRunSimulation: (node: AiNode) => void | Promise<void>;
  savePathConfig?: ((options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
  }) => Promise<void>) | undefined;
};

export function SimulationDialog({
  openNodeId,
  onClose,
  nodes,
  setNodes,
  isPathLocked = false,
  onRunSimulation,
  savePathConfig,
}: SimulationDialogProps): React.JSX.Element | null {
  if (!openNodeId) return null;
  const simulationNode = nodes.find((node: AiNode): boolean => node.id === openNodeId);

  const simulationConfig = simulationNode?.config?.simulation ?? { productId: '' };
  const simulationEntityValue =
    simulationConfig.entityId?.trim()
      ? simulationConfig.entityId
      : simulationConfig.productId ?? '';

  return (
    <Dialog
      open={Boolean(openNodeId)}
      onOpenChange={(open: boolean): void => {
        if (!open) {
          if (savePathConfig) {
            void savePathConfig({
              silent: true,
              includeNodeConfig: true,
              force: true,
              nodesOverride: nodes,
            });
          }
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md border border-border bg-card text-white">
        <DialogHeader>
          <DialogTitle className="text-lg">Simulation Modal</DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Set an Entity ID and simulate the connected trigger action.
          </DialogDescription>
        </DialogHeader>
        {simulationNode ? ((): React.JSX.Element => {
          return (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-400">Entity ID</Label>
                <Input
                  className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
                  disabled={isPathLocked}
                  value={simulationEntityValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const value = event.target.value;
                    setNodes((prev: AiNode[]): AiNode[] =>
                      prev.map((node: AiNode): AiNode =>
                        node.id === simulationNode.id
                          ? {
                            ...node,
                            config: {
                              ...node.config,
                              simulation: {
                                productId: value,
                                entityId: value,
                                entityType: simulationConfig.entityType ?? 'product',
                              },
                            },
                          }
                          : node
                      )
                    );
                  }}
                />
                {isPathLocked ? (
                  <p className="mt-2 text-[11px] text-gray-500">
                    This path is locked. Unlock it to change simulation inputs.
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-gray-500">
                  Current entity type: {simulationConfig.entityType ?? 'product'}
                </p>
              </div>
              <Button
                className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                type="button"
                onClick={(): void => {
                  void onRunSimulation(simulationNode);
                }}
              >
                Simulate Trigger
              </Button>
            </div>
          );
        })() : null}
      </DialogContent>
    </Dialog>
  );
}
