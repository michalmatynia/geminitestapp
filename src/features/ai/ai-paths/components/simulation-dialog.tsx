'use client';

import React from 'react';

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

import {
  useGraphActions,
  useGraphState,
  usePersistenceActions,
  useRuntimeActions,
  useSelectionActions,
  useSelectionState,
} from '../context';


export function SimulationDialog(): React.JSX.Element | null {
  const { nodes, isPathLocked } = useGraphState();
  const { setNodes } = useGraphActions();
  const { runSimulation } = useRuntimeActions();
  const { savePathConfig } = usePersistenceActions();
  const { simulationOpenNodeId } = useSelectionState();
  const { setSimulationOpenNodeId } = useSelectionActions();

  if (!simulationOpenNodeId) return null;

  const simulationNode = nodes.find((node: AiNode): boolean => node.id === simulationOpenNodeId);

  const simulationConfig = simulationNode?.config?.simulation ?? { productId: '' };
  const simulationEntityValue =
    simulationConfig.entityId?.trim()
      ? simulationConfig.entityId
      : simulationConfig.productId ?? '';
  const [draftEntityId, setDraftEntityId] = React.useState<string>(simulationEntityValue);

  React.useEffect((): void => {
    setDraftEntityId(simulationEntityValue);
  }, [simulationOpenNodeId, simulationEntityValue]);

  return (
    <Dialog
      open={Boolean(simulationOpenNodeId)}
      onOpenChange={(open: boolean): void => {
        if (!open) {
          const entityId = draftEntityId;
          setNodes((prev: AiNode[]): AiNode[] => {
            const next = prev.map((node: AiNode): AiNode =>
              node.id === simulationOpenNodeId
                ? {
                  ...node,
                  config: {
                    ...node.config,
                    simulation: {
                      ...node.config?.simulation,
                      productId: entityId,
                      entityId,
                      entityType: node.config?.simulation?.entityType ?? 'product',
                    },
                  },
                }
                : node
            );
            const persistedNode = next.find((node: AiNode): boolean => node.id === simulationOpenNodeId);
            void savePathConfig({
              silent: true,
              includeNodeConfig: true,
              force: true,
              ...(persistedNode ? { nodeOverride: persistedNode } : {}),
            });
            return next;
          });
          setSimulationOpenNodeId(null);
        }
      }}
    >
      <DialogContent className='max-w-md border border-border bg-card text-white'>
        <DialogHeader>
          <DialogTitle className='text-lg'>Simulation Modal</DialogTitle>
          <DialogDescription className='text-sm text-gray-400'>
            Set an Entity ID and simulate the connected trigger action.
          </DialogDescription>
        </DialogHeader>
        {simulationNode ? ((): React.JSX.Element => {
          return (
            <div className='space-y-4'>
              <div>
                <Label className='text-xs text-gray-400'>Entity ID</Label>
                <Input
                  className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
                  disabled={isPathLocked}
                  value={draftEntityId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraftEntityId(event.target.value);
                  }}
                />
                {isPathLocked ? (
                  <p className='mt-2 text-[11px] text-gray-500'>
                    This path is locked. Unlock it to change simulation inputs.
                  </p>
                ) : null}
                <p className='mt-2 text-[11px] text-gray-500'>
                  Current entity type: {simulationConfig.entityType ?? 'product'}
                </p>
              </div>
              <Button
                className='w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10'
                type='button'
                onClick={(): void => {
                  const entityId = draftEntityId;
                  const runNode: AiNode = {
                    ...simulationNode,
                    config: {
                      ...simulationNode.config,
                      simulation: {
                        ...simulationNode.config?.simulation,
                        productId: entityId,
                        entityId,
                        entityType: simulationNode.config?.simulation?.entityType ?? 'product',
                      },
                    },
                  };
                  setNodes((prev: AiNode[]): AiNode[] =>
                    prev.map((node: AiNode): AiNode =>
                      node.id === simulationNode.id ? runNode : node
                    )
                  );
                  void savePathConfig({
                    silent: true,
                    includeNodeConfig: true,
                    force: true,
                    nodeOverride: runNode,
                  });
                  void runSimulation(runNode);
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
