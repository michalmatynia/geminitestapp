'use client';

import React, { useMemo, useCallback } from 'react';

import { useSelectionActions, useSelectionState, useRuntimeActions } from '@/features/ai/ai-paths/context';
import { useGraphActions, useGraphState } from '@/features/ai/ai-paths/context/GraphContext';
import type { EntityModalProps } from '@/shared/contracts/ui';
import type { AiNode } from '@/shared/lib/ai-paths';
import { Button, Input, Alert } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

export interface SimulationDialogProps extends EntityModalProps<AiNode> {
  isPathLocked: boolean;
  onSimulate: (node: AiNode, entityId: string) => Promise<void>;
  onConfigChange: (nodeId: string, entityId: string) => Promise<void>;
}

const applySimulationEntityId = (node: AiNode, entityId: string): AiNode => ({
  ...node,
  config: {
    ...(node.config ?? {}),
    simulation: {
      ...(node.config?.simulation ?? {}),
      entityId,
      productId: entityId,
    },
  },
});

export function SimulationDialog(): React.JSX.Element | null {
  const { nodes, isPathLocked } = useGraphState();
  const { runSimulation: handleRunSimulation } = useRuntimeActions();
  const { simulationOpenNodeId } = useSelectionState();
  const { setSimulationOpenNodeId } = useSelectionActions();
  const { setNodes } = useGraphActions();

  const simulationNode = useMemo(
    (): AiNode | null =>
      simulationOpenNodeId
        ? (nodes.find((node: AiNode): boolean => node.id === simulationOpenNodeId) ?? null)
        : null,
    [nodes, simulationOpenNodeId]
  );

  const isOpen = Boolean(simulationNode);
  const onClose = () => setSimulationOpenNodeId(null);

  const handleConfigChange = useCallback(
    async (nodeId: string, entityId: string): Promise<void> => {
      setNodes((prev: AiNode[]): AiNode[] =>
        prev.map(
          (node: AiNode): AiNode =>
            node.id === nodeId ? applySimulationEntityId(node, entityId) : node
        )
      );
    },
    [setNodes]
  );

  const handleSimulate = useCallback(
    async (node: AiNode, entityId: string): Promise<void> => {
      const nextNode = applySimulationEntityId(node, entityId);
      await handleConfigChange(node.id, entityId);
      await handleRunSimulation(nextNode);
    },
    [handleConfigChange, handleRunSimulation]
  );

  const simulationConfig = simulationNode?.config?.simulation ?? { productId: '' };
  const simulationEntityValue = simulationConfig.entityId?.trim()
    ? simulationConfig.entityId
    : (simulationConfig.productId ?? '');
  const [draftEntityId, setDraftEntityId] = React.useState<string>(simulationEntityValue);

  React.useEffect((): void => {
    setDraftEntityId(simulationEntityValue);
  }, [simulationNode?.id, simulationEntityValue]);

  if (!isOpen || !simulationNode) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={() => {
        void handleConfigChange(simulationNode.id, draftEntityId);
        onClose();
      }}
      title='Simulation'
      subtitle='Set an Entity ID and simulate the connected trigger action.'
      size='sm'
      footer={
        <Button
          className='w-full'
          variant='default'
          type='button'
          onClick={(): void => {
            void handleSimulate(simulationNode, draftEntityId);
          }}
        >
          Simulate Trigger
        </Button>
      }
    >
      <div className='space-y-4'>
        <FormField label='Entity ID' id='entity-id'>
          <Input
            id='entity-id'
            disabled={isPathLocked}
            value={draftEntityId}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setDraftEntityId(event.target.value);
            }}
           aria-label='Entity ID' title='Entity ID'/>
        </FormField>

        {isPathLocked ? (
          <Alert variant='warning' className='px-2 py-1 text-[11px]'>
            This path is locked. Unlock it to change simulation inputs.
          </Alert>
        ) : null}

        <Alert variant='info' className='px-2 py-1 text-[11px]'>
          Current entity type: {simulationConfig.entityType ?? 'product'}
        </Alert>
      </div>
    </DetailModal>
  );
}
