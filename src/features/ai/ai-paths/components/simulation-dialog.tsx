'use client';

import React from 'react';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import type { EntityModalProps } from '@/shared/contracts/ui';
import {
  Button,
  Input,
  Alert,
  FormField,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

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
    <DetailModal
      isOpen={isOpen}
      onClose={() => {
        void onConfigChange(simulationNode.id, draftEntityId);
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
            void onSimulate(simulationNode, draftEntityId);
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
          />
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
