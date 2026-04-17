'use client';

import Link from 'next/link';
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { PlaywrightManagedRuntimeActionsSection } from '@/features/integrations/components/connections/PlaywrightManagedRuntimeActionsSection';
import { PlaywrightProgrammableSessionPreviewSection } from '@/features/integrations/components/connections/PlaywrightProgrammableSessionPreviewSection';
import {
  IMPORT_SCRIPT_PLACEHOLDER,
  LISTING_SCRIPT_PLACEHOLDER,
  PROGRAMMABLE_FIELD_TARGET_OPTIONS,
  getProgrammableConnectionOptions,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { usePlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/usePlaywrightProgrammableIntegrationPageModel';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { PlaywrightCaptureRoutesEditor } from '@/shared/ui/playwright/PlaywrightCaptureRoutesEditor';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin.public';
import { Alert, Button, Card, Input, Textarea } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

type PlaywrightIntegrationPageProps = {
  focusSection?: 'script' | 'import' | null;
};

export default function PlaywrightIntegrationPage({
  focusSection = null,
}: PlaywrightIntegrationPageProps): React.JSX.Element {
  const {
    appearanceMode,
    captureRoutes,
    cleanupReadyConnections,
    cleanupReadyPreviewItems,
    connectionName,
    connections,
    connectionsQuery,
    fieldMapperRows,
    handleAddFieldMapping,
    handleCleanupAllLegacyBrowserFields,
    handleCleanupLegacyBrowserFields,
    handleCreateConnection,
    handleDeleteFieldMapping,
    handlePromoteConnectionSettings,
    handleRunTest,
    handleUpdateFieldMapping,
    importActionId,
    importActionOptions,
    importBaseUrl,
    importScript,
    importSectionRef,
    importSessionPreview,
    integrationsQuery,
    isBrowserBehaviorActionOwned,
    isCleaningAllLegacyBrowserFields,
    isCleaningLegacyBrowserFields,
    isPromotingConnectionSettings,
    listingActionId,
    listingActionOptions,
    listingScript,
    listingSessionPreview,
    managedActionSummaries,
    migrationInfo,
    playwrightActionsQuery,
    programmableIntegration,
    promotionProxyPassword,
    runningTestType,
    saveCurrentConnection,
    scriptSectionRef,
    selectedConnection,
    selectedConnectionId,
    sessionDiagnostics,
    setAppearanceMode,
    setCaptureRoutes,
    setConnectionName,
    setImportActionId,
    setImportBaseUrl,
    setImportScript,
    setListingActionId,
    setListingScript,
    setPromotionProxyPassword,
    setSelectedConnectionId,
    testResultJson,
    upsertConnection,
  } = usePlaywrightProgrammableIntegrationPageModel({ focusSection });

  return (
    <AdminIntegrationsPageLayout
      title='Playwright (Programmable)'
      current='Playwright (Programmable)'
      parent={{ label: 'Marketplaces', href: '/admin/integrations/marketplaces' }}
      description='Configure programmable marketplace scripts, capture routes, field mapping, and the selected Step Sequencer session actions that own browser behavior.'
    >
      {integrationsQuery.isLoading || (programmableIntegration?.id && connectionsQuery.isLoading) ? (
        <LoadingState message='Loading marketplace integrations…' className='py-12' />
      ) : !programmableIntegration ? (
        <Card variant='subtle' padding='md' className='border-border bg-card/40'>
          <div className='space-y-2'>
            <h2 className='text-base font-semibold text-white'>Integration not initialized</h2>
            <p className='text-sm text-gray-400'>
              The <code>playwright-programmable</code> integration does not exist in the current
              database yet. Add it from the integrations setup flow first.
            </p>
          </div>
        </Card>
      ) : (
        <div className='space-y-6'>
          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>Runtime Ownership</h2>
                <p className='text-sm text-gray-400'>
                  The Step Sequencer owns marketplace-native runtime actions like Tradera and
                  Vinted browser flows, including headless or headed mode and
                  <code className='mx-1'>browser_preparation</code> step settings.
                </p>
                <p className='text-sm text-gray-400'>
                  This programmable page owns connection-scoped scripts, import routing, field
                  mapping, and the selected listing or import session action. The Step Sequencer
                  now owns browser mode and browser_preparation for programmable runs too.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' asChild>
                  <Link href='/admin/playwright/step-sequencer'>Open Step Sequencer</Link>
                </Button>
                <Button variant='outline' size='sm' asChild>
                  <Link href='/admin/settings/playwright'>Manage Personas</Link>
                </Button>
              </div>
            </div>
          </Card>

          <PlaywrightManagedRuntimeActionsSection
            description='Programmable listing and import runs now resolve headless or headed mode, browser preference, and browser_preparation step overrides from these Step Sequencer runtime actions.'
            isLoading={playwrightActionsQuery.isPending}
            summaries={managedActionSummaries}
          />

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
              <FormField
                label='Connection'
                description='Each programmable connection stores its own scripts, import routes, field mapping, persona selection, and selected listing or import session actions.'
              >
                <SelectSimple
                  value={selectedConnectionId}
                  onValueChange={setSelectedConnectionId}
                  options={getProgrammableConnectionOptions(connections)}
                  placeholder={connections.length > 0 ? 'Select connection' : 'No connections yet'}
                  ariaLabel='Programmable Playwright connection'
                  title='Programmable Playwright connection'
                />
              </FormField>
              <div className='flex gap-2'>
                <Button type='button' variant='outline' onClick={() => void handleCreateConnection()}>
                  <Plus className='mr-1.5 h-3.5 w-3.5' />
                  New Connection
                </Button>
                <Button
                  type='button'
                  onClick={() => {
                    void saveCurrentConnection(true);
                  }}
                  loading={
                    !isPromotingConnectionSettings &&
                    upsertConnection.isPending &&
                    runningTestType === null
                  }
                >
                  Save Connection
                </Button>
              </div>
            </div>
          </Card>

          {cleanupReadyConnections.length > 1 ? (
            <Alert variant='warning' className='text-xs'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div className='space-y-2'>
                  <strong>{cleanupReadyConnections.length}</strong> programmable connections
                  already point at their generated Step Sequencer drafts and still carry stale
                  browser fields in the connection record. Clear those stored fields in one pass.
                  <div className='space-y-1 text-[11px] text-amber-100/90'>
                    {cleanupReadyPreviewItems.map((item) => (
                      <div key={item.id}>
                        <button
                          type='button'
                          className='font-semibold underline underline-offset-2 transition hover:text-white'
                          onClick={() => {
                            setSelectedConnectionId(item.id);
                          }}
                        >
                          {item.name}
                        </button>
                        :{' '}
                        <Link
                          href={resolveStepSequencerActionHref(item.listingDraftActionId)}
                          className='underline underline-offset-2 transition hover:text-white'
                        >
                          {item.listingDraftActionName}
                        </Link>{' '}
                        and{' '}
                        <Link
                          href={resolveStepSequencerActionHref(item.importDraftActionId)}
                          className='underline underline-offset-2 transition hover:text-white'
                        >
                          {item.importDraftActionName}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    void handleCleanupAllLegacyBrowserFields();
                  }}
                  loading={isCleaningAllLegacyBrowserFields}
                >
                  Clear all safe stored browser fields
                </Button>
              </div>
            </Alert>
          ) : null}

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <FormField label='Connection Name'>
                <Input
                  value={connectionName}
                  onChange={(event) => setConnectionName(event.target.value)}
                  placeholder='Playwright Connection'
                  aria-label='Playwright connection name'
                />
              </FormField>
              <Alert
                variant={migrationInfo?.hasLegacyBrowserBehavior ? 'warning' : 'info'}
                className='text-xs'
              >
                {migrationInfo?.hasLegacyBrowserBehavior
                  ? 'This connection still has legacy browser behavior stored on the connection model. It is read-only here now. Promote it into action drafts to keep editing browser posture in the Step Sequencer.'
                  : 'This connection no longer owns persona or browser overrides. Browser behavior now comes from the selected listing and import session actions. Edit those actions in the Step Sequencer to change persona, headed or headless mode, browser choice, or browser_preparation.'}
              </Alert>
            </div>

            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
              <FormField
                label='Listing Runtime Action'
                description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable listing runs on this connection.'
              >
                <SelectSimple
                  value={listingActionId}
                  onValueChange={setListingActionId}
                  options={listingActionOptions}
                  ariaLabel='Programmable listing runtime action'
                  title='Programmable listing runtime action'
                />
              </FormField>
              <FormField
                label='Import Runtime Action'
                description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable import runs on this connection.'
              >
                <SelectSimple
                  value={importActionId}
                  onValueChange={setImportActionId}
                  options={importActionOptions}
                  ariaLabel='Programmable import runtime action'
                  title='Programmable import runtime action'
                />
              </FormField>
            </div>

            {isBrowserBehaviorActionOwned ? (
              <p className='mt-4 text-xs text-gray-400'>
                Saving this connection keeps legacy Playwright browser fields cleared. The selected
                session actions remain the only browser-behavior editor for this connection.
              </p>
            ) : null}
          </Card>

          <PlaywrightProgrammableSessionPreviewSection
            diagnostics={sessionDiagnostics}
            listingPreview={listingSessionPreview}
            importPreview={importSessionPreview}
          />

          {migrationInfo?.hasLegacyBrowserBehavior ? (
            <Alert variant='warning' className='text-xs'>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  This programmable connection still stores browser behavior on the connection
                  model: <strong>{migrationInfo.legacySummary.join(', ')}</strong>. The safe
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                    <>
                      {' '}cleanup path is to clear those stored fields now. This connection already
                      points at its generated action drafts:{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.listingDraftActionName}
                      </Link>{' '}
                      and{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.importDraftActionName}
                      </Link>.
                    </>
                  ) : (
                    <>
                      {' '}migration path is to fork the selected session actions into
                      connection-owned drafts and clear the connection-level Playwright settings
                      afterward. Planned drafts:{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.listingDraftActionName}
                      </Link>{' '}
                      and{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.importDraftActionName}
                      </Link>.
                    </>
                  )}
                </div>
                {migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => {
                      void handleCleanupLegacyBrowserFields();
                    }}
                    loading={isCleaningLegacyBrowserFields}
                  >
                    Clear stored browser fields
                  </Button>
                ) : (
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => {
                      void handlePromoteConnectionSettings();
                    }}
                    disabled={
                      playwrightActionsQuery.isPending ||
                      migrationInfo.requiresManualProxyPasswordInput
                    }
                    loading={isPromotingConnectionSettings}
                  >
                    Promote to action drafts
                  </Button>
                )}
              </div>
              {migrationInfo.requiresManualProxyPasswordInput &&
              !migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-end'>
                  <div className='text-[11px] text-amber-200/90'>
                    Re-enter the proxy password before promotion. The stored password is masked in
                    the connection payload and cannot be copied into the action drafts unless you
                    provide it again here.
                  </div>
                  <FormField label='Proxy Password'>
                    <Input
                      type='password'
                      value={promotionProxyPassword}
                      onChange={(event) => setPromotionProxyPassword(event.target.value)}
                      aria-label='Proxy password for promotion'
                    />
                  </FormField>
                </div>
              ) : null}
            </Alert>
          ) : null}

          <div ref={scriptSectionRef}>
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h2 className='text-base font-semibold text-white'>Listing Script</h2>
                  <p className='mt-1 text-sm text-gray-400'>
                    Receives one product input and must emit
                    <code className='ml-1'>{'result'}</code> with at least
                    <code className='ml-1'>{'listingUrl'}</code> or
                    <code className='ml-1'>{'externalListingId'}</code>.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void handleRunTest('listing');
                  }}
                  loading={runningTestType === 'listing'}
                >
                  Test Script
                </Button>
              </div>

              <div className='mt-4 space-y-4'>
                <FormField label='Script'>
                  <Textarea
                    value={listingScript}
                    onChange={(event) => setListingScript(event.target.value)}
                    placeholder={LISTING_SCRIPT_PLACEHOLDER}
                    aria-label='Listing script editor'
                    className='min-h-[320px] font-mono text-xs'
                  />
                </FormField>
              </div>
            </Card>
          </div>

          <div ref={importSectionRef}>
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h2 className='text-base font-semibold text-white'>Import Configuration</h2>
                  <p className='mt-1 text-sm text-gray-400'>
                    Capture routes define where the programmable import script navigates before it
                    emits raw product objects.
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    void handleRunTest('import');
                  }}
                  loading={runningTestType === 'import'}
                >
                  Test Import
                </Button>
              </div>

              <div className='mt-4 space-y-4'>
                <PlaywrightCaptureRoutesEditor
                  routes={captureRoutes}
                  baseUrl={importBaseUrl}
                  appearanceMode={appearanceMode}
                  onChange={({ routes, baseUrl, appearanceMode: nextAppearanceMode }) => {
                    if (routes) {
                      setCaptureRoutes(routes);
                    }
                    if (baseUrl !== undefined) {
                      setImportBaseUrl(baseUrl);
                    }
                    if (nextAppearanceMode !== undefined) {
                      setAppearanceMode(nextAppearanceMode);
                    }
                  }}
                />

                <FormField label='Import Script'>
                  <Textarea
                    value={importScript}
                    onChange={(event) => setImportScript(event.target.value)}
                    placeholder={IMPORT_SCRIPT_PLACEHOLDER}
                    aria-label='Import script editor'
                    className='min-h-[280px] font-mono text-xs'
                  />
                </FormField>
              </div>
            </Card>
          </div>

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-base font-semibold text-white'>Field Mapper</h2>
                <p className='mt-1 text-sm text-gray-400'>
                  Map arbitrary script output keys into normalized product fields before import.
                </p>
              </div>
              <Button type='button' variant='outline' onClick={handleAddFieldMapping}>
                <Plus className='mr-1.5 h-3.5 w-3.5' />
                Add Mapping
              </Button>
            </div>

            <div className='mt-4 space-y-3'>
              {fieldMapperRows.length === 0 ? (
                <div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-gray-400'>
                  No field mappings configured. Fallback keys like <code>title</code>,
                  <code className='ml-1'>description</code>, <code className='ml-1'>price</code>,
                  and <code className='ml-1'>images</code> will still be read when present.
                </div>
              ) : (
                fieldMapperRows.map((row) => (
                  <div
                    key={row.id}
                    className='grid gap-3 rounded-lg border border-border/50 bg-background/30 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]'
                  >
                    <FormField label='Source Key'>
                      <Input
                        value={row.sourceKey}
                        onChange={(event) =>
                          handleUpdateFieldMapping(row.id, { sourceKey: event.target.value })
                        }
                        placeholder='product.title or data.name'
                        aria-label='Field mapper source key'
                      />
                    </FormField>
                    <FormField label='Target Field'>
                      <SelectSimple
                        value={row.targetField}
                        onValueChange={(value) =>
                          handleUpdateFieldMapping(row.id, {
                            targetField: value as ProgrammableFieldMapperRow['targetField'],
                          })
                        }
                        options={PROGRAMMABLE_FIELD_TARGET_OPTIONS}
                        ariaLabel='Field mapper target field'
                        title='Field mapper target field'
                      />
                    </FormField>
                    <div className='flex items-end'>
                      <Button
                        type='button'
                        variant='ghost'
                        onClick={() => handleDeleteFieldMapping(row.id)}
                      >
                        <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {migrationInfo?.hasLegacyBrowserBehavior ? (
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields
                    ? 'Stored browser fields can be cleared'
                    : 'Legacy browser settings require promotion'}
                </h2>
                <p className='text-sm text-gray-400'>
                  {migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
                    <>
                      This programmable connection already points at{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.listingDraftActionName}
                      </Link>{' '}
                      and{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.importDraftActionName}
                      </Link>. Clear the stored
                      legacy browser fields to finish the ownership cleanup.
                    </>
                  ) : (
                    <>
                      Connection-scoped Playwright browser settings are now read-only on the
                      programmable connection. Promote the stored legacy behavior into{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.listingDraftActionName}
                      </Link>{' '}
                      and{' '}
                      <Link
                        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
                        className='font-semibold underline underline-offset-2 transition hover:text-white'
                      >
                        {migrationInfo.importDraftActionName}
                      </Link>, then continue editing
                      browser posture in the Step Sequencer.
                    </>
                  )}
                </p>
              </div>
            </Card>
          ) : (
            <Card variant='subtle' padding='md' className='border-border bg-card/40'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold text-white'>
                  Browser behavior owned by selected actions
                </h2>
                <p className='text-sm text-gray-400'>
                  Connection-scoped Playwright persona and override fields are disabled for this
                  connection. Update{' '}
                  <Link
                    href={resolveStepSequencerActionHref(listingSessionPreview.action.id)}
                    className='font-semibold underline underline-offset-2 transition hover:text-white'
                  >
                    {listingSessionPreview.action.name}
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={resolveStepSequencerActionHref(importSessionPreview.action.id)}
                    className='font-semibold underline underline-offset-2 transition hover:text-white'
                  >
                    {importSessionPreview.action.name}
                  </Link>{' '}
                  in the Step Sequencer when you need to change browser posture.
                </p>
              </div>
            </Card>
          )}

          <Card variant='subtle' padding='md' className='border-border bg-card/40'>
            <h2 className='text-base font-semibold text-white'>Last Test Result</h2>
            <p className='mt-1 text-sm text-gray-400'>
              The test API runs the saved script once through the same Playwright runner used by the
              queue.
            </p>
            <pre className='mt-4 overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
              {testResultJson || 'No test run yet.'}
            </pre>
          </Card>
        </div>
      )}
    </AdminIntegrationsPageLayout>
  );
}
