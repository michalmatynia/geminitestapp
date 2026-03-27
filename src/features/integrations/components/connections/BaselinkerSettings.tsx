'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';

import { useBaselinkerSettingsState } from '@/features/integrations/hooks/useBaselinkerSettingsState';
import { useQuickImportBaseOrdersMutation } from '@/features/products/hooks/useProductOrdersImport';
import { buildBaseOrderQuickImportFeedback } from '@/features/products/utils/base-order-quick-import-feedback';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import {
  Button,
  Input,
  SelectSimple,
  StatusBadge,
  Alert,
  FormSection,
  FormField,
  CompactEmptyState,
  FormActions,
  useToast,
  MetadataItem,
  Card,
  Hint,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type QuickImportResultState =
  | {
      variant: 'success' | 'error' | 'info';
      message: string;
      syncedAt: string | null;
    }
  | null;

export function BaselinkerSettings(): React.JSX.Element {
  const { toast } = useToast();
  const quickImportMutation = useQuickImportBaseOrdersMutation();
  const [quickImportResult, setQuickImportResult] = React.useState<QuickImportResultState>(null);
  const {
    connections,
    activeConnection,
    baselinkerConnected,
    baseTokenUpdatedAt,
    syncIntervalMinutes,
    setSyncIntervalMinutes,
    handleSaveAll,
    isSaving,
    isDirty,
    defaultOneClickConnectionId,
    setDefaultOneClickConnectionId,
    defaultExportConnectionId,
    handleBaselinkerTest,
    isTesting,
  } = useBaselinkerSettingsState();
  const connectionOptions = useMemo<Array<LabeledOptionWithDescriptionDto<string>>>(
    () =>
      connections.map((connection) => ({
        value: connection.id,
        label: connection.name,
        description: connection.hasBaseApiToken
          ? 'Base API token configured'
          : 'Token not detected',
      })),
    [connections]
  );

  React.useEffect(() => {
    setQuickImportResult(null);
  }, [activeConnection?.id]);

  const onSave = async (): Promise<void> => {
    try {
      await handleSaveAll();
      toast('Baselinker settings saved successfully.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save settings.', {
        variant: 'error',
      });
    }
  };

  const handleQuickImport = async (): Promise<void> => {
    if (!activeConnection) {
      const message = 'Add a Base.com connection first.';
      setQuickImportResult({
        variant: 'error',
        message,
        syncedAt: null,
      });
      toast(message, { variant: 'error' });
      return;
    }

    try {
      const response = await quickImportMutation.mutateAsync({
        connectionId: activeConnection.id,
        limit: 50,
      });
      const feedback = buildBaseOrderQuickImportFeedback(response);
      setQuickImportResult({
        variant: feedback.variant,
        message: feedback.message,
        syncedAt: response.syncedAt,
      });
      toast(feedback.message, { variant: feedback.variant });
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error ? error.message : 'Failed to import Base.com orders.';
      setQuickImportResult({
        variant: 'error',
        message,
        syncedAt: null,
      });
      toast(message, { variant: 'error' });
    }
  };

  return (
    <FormSection
      title='Baselinker API'
      description='Enter your Baselinker API token in the connection fields, then test the connection to verify it works.'
      className='p-6'
    >
      {!activeConnection ? (
        <CompactEmptyState
          title='No connection'
          description='Add a connection first to enable Baselinker API access.'
          className='bg-card/20 py-8'
         />
      ) : (
        <div className='space-y-6'>
          {/* Connection Status */}
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-white'>Connection status</span>
                <StatusBadge status={baselinkerConnected ? 'Connected' : 'Not tested'} />
              </div>
              <MetadataItem label='Last verified' value={baseTokenUpdatedAt} variant='minimal' />
              {activeConnection.baseLastInventoryId && (
                <MetadataItem
                  label='Last inventory'
                  value={activeConnection.baseLastInventoryId}
                  variant='minimal'
                />
              )}
              <div className='pt-2'>
                <div className='grid gap-2 sm:grid-cols-2'>
                  <Button
                    type='button'
                    onClick={() => {
                      void handleBaselinkerTest(activeConnection);
                    }}
                    loading={isTesting}
                    variant='outline'
                    size='xs'
                    className='w-full'
                  >
                    {baselinkerConnected ? 'Re-test Connection' : 'Test Connection'}
                  </Button>
                  <Button
                    type='button'
                    onClick={() => {
                      void handleQuickImport();
                    }}
                    loading={quickImportMutation.isPending}
                    variant='default'
                    size='xs'
                    className='w-full'
                    disabled={!activeConnection?.hasBaseApiToken}
                  >
                    Import Latest Orders
                  </Button>
                </div>
              </div>
              {quickImportResult ? (
                <Alert
                  variant={quickImportResult.variant}
                  title='Latest order import'
                  className='mt-2 p-3 text-xs'
                >
                  <div>{quickImportResult.message}</div>
                  {quickImportResult.syncedAt ? (
                    <div className='mt-2 opacity-80'>
                      Synced at {new Date(quickImportResult.syncedAt).toLocaleString()}.
                    </div>
                  ) : null}
                  <div className='mt-2'>
                    <Link
                      href='/admin/products/orders-import'
                      className='underline underline-offset-4 hover:opacity-90'
                    >
                      Open detailed importer
                    </Link>
                  </div>
                </Alert>
              ) : null}
            </Card>

            <div className='space-y-4'>
              <FormField label='Sync Interval' description='How often to check for status updates.'>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='1'
                    value={syncIntervalMinutes}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                      setSyncIntervalMinutes(event.target.value)
                    }
                    size='sm'
                    className='w-24 h-9'
                   aria-label='Sync Interval' title='Sync Interval'/>
                  <span className='text-xs text-gray-500 font-medium uppercase'>Minutes</span>
                </div>
              </FormField>

              <Hint>
                Frequent sync ensures real-time listing status but consumes more API credits.
              </Hint>
            </div>
          </div>

          {/* OneClick Configuration */}
          <FormSection
            title='Default OneClick Export'
            description='Used by Product List one-click export to Base.com (BL button).'
            variant='subtle'
            className='p-4 bg-white/5 border border-white/5'
          >
            <div className='space-y-3 mt-2'>
              <SelectSimple
                value={defaultOneClickConnectionId || undefined}
                onValueChange={(value: string): void => {
                  setDefaultOneClickConnectionId(value);
                }}
                options={connectionOptions}
                placeholder='Select default connection...'
                disabled={connections.length === 0}
                size='sm'
               ariaLabel='Select default connection...' title='Select default connection...'/>
              {defaultExportConnectionId ? (
                <MetadataItem
                  label='Active Default ID'
                  value={defaultExportConnectionId}
                  mono
                  variant='subtle'
                />
              ) : (
                <Hint>No default connection configured yet.</Hint>
              )}
            </div>
          </FormSection>

          {/* Help Card */}
          <Card variant='subtle-compact' padding='sm' className='bg-blue-500/5 border-blue-500/20'>
            <div className='flex gap-3 text-xs text-blue-300/80'>
              <span className='shrink-0'>ℹ</span>
              <p>
                To get your API token, log in to{' '}
                <a
                  href='https://baselinker.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-300 underline hover:text-blue-200'
                >
                  Baselinker
                </a>{' '}
                → My Account → API.
              </p>
            </div>
          </Card>

          <FormActions
            onSave={() => {
              void onSave();
            }}
            saveText='Save Baselinker Settings'
            isSaving={isSaving}
            isDisabled={!isDirty}
            className='pt-4 border-t border-white/5'
          />
        </div>
      )}
    </FormSection>
  );
}
