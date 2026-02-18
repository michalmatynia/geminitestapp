'use client';

import { DB_COLLECTION_OPTIONS } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, SelectSimple } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

export function SimulationNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig, handleRunSimulation } = useAiPathConfig();

  if (selectedNode?.type !== 'simulation') return null;

  const simulationConfig = selectedNode.config?.simulation ?? {
    productId: '',
    entityType: 'product',
    entityId: '',
  };
  const simulationEntityValue =
    simulationConfig.entityId?.trim()
      ? simulationConfig.entityId
      : simulationConfig.productId ?? '';
  const trimmedEntityId = simulationEntityValue.trim();
  const looksLikeUuid = trimmedEntityId.includes('-');
  const idLength = trimmedEntityId.length;
  const showIdHint =
    Boolean(trimmedEntityId) &&
    (looksLikeUuid ? idLength !== 36 : false);

  const collectionOptions = DB_COLLECTION_OPTIONS
    .filter((opt: { value: string }): boolean => opt.value !== 'custom')
    .map((opt: { value: string; label: string }) => ({
      value: opt.value,
      label: opt.label,
    }));

  return (
    <div className='space-y-4'>
      <div>
        <Label className='text-xs text-gray-400'>Collection Type</Label>
        <SelectSimple size='sm'
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
          className='mt-2'
        />
      </div>
      <div>
        <Label className='text-xs text-gray-400'>Document ID</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
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
        />
        {showIdHint ? (
          <div className='mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
            This looks like a UUID, but its length is {idLength}. UUIDs should be 36 characters.
          </div>
        ) : null}
      </div>
      <p className='text-[11px] text-gray-500'>
        Used to simulate {simulationConfig.entityType ?? 'products'} collection context.
      </p>
      <Button
        className='w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10'
        type='button'
        onClick={() => { void handleRunSimulation(selectedNode); }}
      >
        Run Simulation
      </Button>
    </div>
  );
}
