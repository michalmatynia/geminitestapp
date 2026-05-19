'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';

import { useBaselinkerSettingsState } from '@/features/integrations/hooks/useBaselinkerSettingsState';
import { useQuickImportBaseOrdersMutation } from '@/shared/hooks/useBaseOrderQuickImport';
import { buildBaseOrderQuickImportFeedback } from '@/shared/lib/base-order-quick-import-feedback';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { Button, Input, Alert, useToast, Card } from '@/shared/ui/primitives.public';
import { SelectSimple, FormSection, FormField, FormActions, Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { CompactEmptyState, MetadataItem, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type QuickImportResultState =
  | {
      variant: 'success' | 'error' | 'info';
      message: string;
      syncedAt: string | null;
    }
  | null;

interface BaselinkerStatusCardProps {
  connected: boolean;
  verifiedAt: string;
  inventoryId: string | null;
  isTesting: boolean;
  isImporting: boolean;
  hasApiToken: boolean;
  onTest: () => void;
  onImport: () => void;
  importResult: QuickImportResultState;
  activeConnectionId: string;
}

function BaselinkerImportAlert({ 
  result, 
  connectionId 
}: { 
  result: QuickImportResultState; 
  connectionId: string; 
}): React.JSX.Element | null {
  if (result === null) return null;
  return (
    <Alert variant={result.variant} title='Latest order import' className='mt-2 p-3 text-xs'>
      <div>{result.message}</div>
      {result.syncedAt !== null && result.syncedAt.length > 0 && (
        <div className='mt-2 opacity-80'>
          Synced at {new Date(result.syncedAt).toLocaleString()}.
        </div>
      )}
      <div className='mt-2'>
        <Link
          href={`/admin/products/orders-import?connectionId=${encodeURIComponent(connectionId)}&autoPreview=1`}
          className='underline underline-offset-4 hover:opacity-90'
        >
          Open detailed importer
        </Link>
      </div>
    </Alert>
  );
}

function BaselinkerStatusCard(props: BaselinkerStatusCardProps): React.JSX.Element {
  const { connected, verifiedAt, inventoryId, isTesting, isImporting, hasApiToken, onTest, onImport, importResult, activeConnectionId } = props;
  return (
    <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-white'>Connection status</span>
        <StatusBadge status={connected ? 'Connected' : 'Not tested'} />
      </div>
      <MetadataItem label='Last verified' value={verifiedAt} variant='minimal' />
      {inventoryId !== null && inventoryId.length > 0 && (
        <MetadataItem label='Last inventory' value={inventoryId} variant='minimal' />
      )}
      <div className='pt-2'>
        <div className='grid gap-2 sm:grid-cols-2'>
          <Button type='button' onClick={onTest} loading={isTesting} variant='outline' size='xs' className='w-full'>
            {connected ? 'Re-test Connection' : 'Test Connection'}
          </Button>
          <Button type='button' onClick={onImport} loading={isImporting} variant='default' size='xs' className='w-full' disabled={!hasApiToken}>
            Import Latest Orders
          </Button>
        </div>
      </div>
      <BaselinkerImportAlert result={importResult} connectionId={activeConnectionId} />
    </Card>
  );
}

function BaselinkerSyncForm({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <FormField label='Sync Interval' description='How often to check for status updates.'>
        <div className='flex items-center gap-2'>
          <Input type='number' min='1' value={value} size='sm' className='w-24 h-9' aria-label='Sync Interval' title='Sync Interval'
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
          <span className='text-xs text-gray-500 font-medium uppercase'>Minutes</span>
        </div>
      </FormField>
      <Hint>Frequent sync ensures real-time listing status but consumes more API credits.</Hint>
    </div>
  );
}

function OneClickConfig({ 
  value, 
  options, 
  disabled, 
  activeId,
  onChange
}: { 
  value: string; 
  options: Array<LabeledOptionWithDescriptionDto<string>>; 
  disabled: boolean; 
  activeId: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <FormSection title='Default OneClick Export' description='Used by Product List one-click export to Base.com (BL button).' variant='subtle' className='p-4 bg-white/5 border border-white/5'>
      <div className='space-y-3 mt-2'>
        <SelectSimple value={value.length > 0 ? value : undefined} onValueChange={onChange} options={options} placeholder='Select default connection...' disabled={disabled} size='sm' ariaLabel='Select default connection...' title='Select default connection...'/>
        {activeId.length > 0 ? <MetadataItem label='Active Default ID' value={activeId} mono variant='subtle' /> : <Hint>No default connection configured yet.</Hint>}
      </div>
    </FormSection>
  );
}

export function BaselinkerSettings(): React.JSX.Element {
  const { toast } = useToast();
  const quickImportMutation = useQuickImportBaseOrdersMutation();
  const [quickImportResult, setQuickImportResult] = React.useState<QuickImportResultState>(null);
  const { connections, activeConnection, baselinkerConnected, baseTokenUpdatedAt, syncIntervalMinutes, setSyncIntervalMinutes, handleSaveAll, isSaving, isDirty, defaultOneClickConnectionId, setDefaultOneClickConnectionId, defaultExportConnectionId, handleBaselinkerTest, isTesting } = useBaselinkerSettingsState();

  const connectionOptions = useMemo<Array<LabeledOptionWithDescriptionDto<string>>>(() => connections.map((c) => ({ value: c.id, label: c.name, description: c.hasBaseApiToken === true ? 'Base API token configured' : 'Token not detected' })), [connections]);

  React.useEffect(() => { setQuickImportResult(null); }, [activeConnection?.id]);

  const onSave = async (): Promise<void> => {
    try { await handleSaveAll(); toast('Baselinker settings saved successfully.', { variant: 'success' }); }
    catch (e) { logClientError(e); toast(e instanceof Error ? e.message : 'Failed to save settings.', { variant: 'error' }); }
  };

  const handleQuickImport = async (): Promise<void> => {
    if (activeConnection === null) {
      setQuickImportResult({ variant: 'error', message: 'Add a Base.com connection first.', syncedAt: null });
      return;
    }
    try {
      const response = await quickImportMutation.mutateAsync({ connectionId: activeConnection.id, limit: 50 });
      const feedback = buildBaseOrderQuickImportFeedback(response);
      setQuickImportResult({ variant: feedback.variant, message: feedback.message, syncedAt: response.syncedAt });
      toast(feedback.message, { variant: feedback.variant });
    } catch (e) { setQuickImportResult({ variant: 'error', message: e instanceof Error ? e.message : 'Failed to import.', syncedAt: null }); }
  };

  if (activeConnection === null) return (
    <FormSection title='Baselinker API' description='Enter your Baselinker API token...' className='p-6'>
      <CompactEmptyState title='No connection' description='Add a connection first...' className='bg-card/20 py-8' />
    </FormSection>
  );

  return (
    <FormSection title='Baselinker API' description='Enter your Baselinker API token...' className='p-6'>
      <div className='space-y-6'>
        <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
          <BaselinkerStatusCard connected={baselinkerConnected} verifiedAt={baseTokenUpdatedAt} inventoryId={activeConnection.baseLastInventoryId ?? null} isTesting={isTesting} isImporting={quickImportMutation.isPending} hasApiToken={activeConnection.hasBaseApiToken === true} onTest={() => { void handleBaselinkerTest(activeConnection); }} onImport={() => { void handleQuickImport(); }} importResult={quickImportResult} activeConnectionId={activeConnection.id} />
          <BaselinkerSyncForm value={syncIntervalMinutes} onChange={setSyncIntervalMinutes} />
        </div>
        <OneClickConfig value={defaultOneClickConnectionId} options={connectionOptions} disabled={connections.length === 0} activeId={defaultExportConnectionId} onChange={setDefaultOneClickConnectionId} />
        <FormActions onSave={() => { void onSave(); }} saveText='Save Baselinker Settings' isSaving={isSaving} isDisabled={!isDirty} className='pt-4 border-t border-white/5' />
      </div>
    </FormSection>
  );
}
