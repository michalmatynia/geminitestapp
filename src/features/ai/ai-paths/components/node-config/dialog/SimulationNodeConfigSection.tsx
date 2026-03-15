'use client';

import { DB_COLLECTION_OPTIONS } from '@/shared/lib/ai-paths';
import { Button, Input, SelectSimple, Card, FormField } from '@/shared/ui';

import {
  useAiPathOrchestrator,
  useAiPathRuntime,
  useAiPathSelection,
} from '../../AiPathConfigContext';

export function SimulationNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { handleRunSimulation } = useAiPathRuntime();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();

  if (selectedNode?.type !== 'simulation') return null;

  const simulationConfig = selectedNode.config?.simulation ?? {
    productId: '',
    entityType: 'product',
    entityId: '',
    runBehavior: 'before_connected_trigger',
  };
  const simulationEntityValue = simulationConfig.entityId?.trim()
    ? simulationConfig.entityId
    : (simulationConfig.productId ?? '');
  const trimmedEntityId = simulationEntityValue.trim();
  const looksLikeUuid = trimmedEntityId.includes('-');
  const idLength = trimmedEntityId.length;
  const showIdHint = Boolean(trimmedEntityId) && (looksLikeUuid ? idLength !== 36 : false);

  const collectionOptions = DB_COLLECTION_OPTIONS.filter(
    (opt: { value: string }): boolean => opt.value !== 'custom'
  ).map((opt: { value: string; label: string }) => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <div className='space-y-4'>
      <FormField label='Collection Type'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={simulationConfig.entityType ?? 'products'}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              simulation: {
                ...simulationConfig,
                entityType: value,
              },
            })
          }
          options={collectionOptions}
          placeholder='Select collection'
         ariaLabel='Select collection' title='Select collection'/>
      </FormField>

      <FormField label='Document ID'>
        <Input
          variant='subtle'
          size='sm'
          value={simulationEntityValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              simulation: {
                ...simulationConfig,
                entityId: event.target.value,
                productId: event.target.value,
              },
            })
          }
         aria-label='Document ID' title='Document ID'/>
        {showIdHint ? (
          <Card variant='warning' padding='sm' className='mt-2 text-[11px] text-amber-100'>
            This looks like a UUID, but its length is {idLength}. UUIDs should be 36 characters.
          </Card>
        ) : null}
      </FormField>

      <FormField label='Run Behavior'>
        <SelectSimple
          size='sm'
          variant='subtle'
          value={simulationConfig.runBehavior ?? 'before_connected_trigger'}
          onValueChange={(value: string): void =>
            updateSelectedNodeConfig({
              simulation: {
                ...simulationConfig,
                runBehavior: value as 'before_connected_trigger' | 'manual_only',
              },
            })
          }
          options={[
            {
              value: 'before_connected_trigger',
              label: 'Auto-run before connected Trigger',
            },
            {
              value: 'manual_only',
              label: 'Manual only',
            },
          ]}
          placeholder='Select run behavior'
         ariaLabel='Select run behavior' title='Select run behavior'/>
      </FormField>

      <p className='text-[11px] text-gray-500 italic'>
        Used to simulate {simulationConfig.entityType ?? 'products'} collection context.
      </p>

      <Button
        className='w-full'
        variant='outline'
        type='button'
        onClick={() => {
          void handleRunSimulation(selectedNode);
        }}
      >
        Run Simulation
      </Button>
    </div>
  );
}
