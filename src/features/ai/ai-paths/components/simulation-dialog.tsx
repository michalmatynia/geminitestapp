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
import type { EntityModalProps } from '@/shared/types/modal-props';

interface SimulationDialogProps extends EntityModalProps<AiNode> {
  isPathLocked: boolean;
  onSimulate: (node: AiNode, entityId: string) => Promise<void>;
  onConfigChange: (nodeId: string, entityId: string) => Promise<void>;
}

export function SimulationDialog({
  isOpen,
  onClose,
  item: simulationNode,
  isPathLocked,
  onSimulate,
  onConfigChange,
}: SimulationDialogProps): React.JSX.Element | null {
  const simulationConfig = simulationNode?.config?.simulation ?? { productId: '' };
  const simulationEntityValue =
    simulationConfig.entityId?.trim()
      ? simulationConfig.entityId
      : simulationConfig.productId ?? '';
  const [draftEntityId, setDraftEntityId] = React.useState<string>(simulationEntityValue);

  React.useEffect((): void => {
    setDraftEntityId(simulationEntityValue);
  }, [simulationNode?.id, simulationEntityValue]);

  if (!isOpen || !simulationNode) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean): void => {
        if (!open) {
          void onConfigChange(simulationNode.id, draftEntityId);
          onClose();
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
              void onSimulate(simulationNode, draftEntityId);
            }}
          >
            Simulate Trigger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
