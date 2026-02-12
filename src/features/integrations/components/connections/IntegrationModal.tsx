'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import type { PlaywrightPersona } from '@/features/playwright';
import { PlaywrightSettingsProvider } from '@/features/playwright/context/PlaywrightSettingsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, AppModal, UnifiedSelect, SectionPanel, FormSection, FormField } from '@/shared/ui';

import { AllegroApiConsole } from './AllegroApiConsole';
import { AllegroSettings } from './AllegroSettings';
import { BaseApiConsole } from './BaseApiConsole';
import { BaselinkerSettings } from './BaselinkerSettings';
import { ConnectionManager } from './ConnectionManager';
import { SessionModal } from './SessionModal';
import { TestLogModal } from './TestLogModal';
import { TestResultModal } from './TestResultModal';

function DynamicPlaywrightSettingsForm(): React.JSX.Element {
  const { playwrightSettings, setPlaywrightSettings, handleSavePlaywrightSettings } = useIntegrationsContext();
  const [Component, setComponent] = useState<React.ComponentType<{ onSave: () => void }> | null>(null);

  useEffect(() => {
    const loadComponent = async (): Promise<void> => {
      const { PlaywrightSettingsFormContent } = await import('@/features/playwright');
      setComponent(() => PlaywrightSettingsFormContent);
    };
    void loadComponent();
  }, []);

  if (!Component) {
    return <div className='p-4 text-gray-400'>Loading...</div>;
  }

  return (
    <PlaywrightSettingsProvider 
      settings={playwrightSettings} 
      setSettings={setPlaywrightSettings}
    >
      <Component
        onSave={() => { void handleSavePlaywrightSettings(); }}
      />
    </PlaywrightSettingsProvider>
  );
}

export function IntegrationModal(): React.JSX.Element {
  const {
    activeIntegration,
    connections,
    onCloseModal,
    
    // Modals State
    showTestLogModal,
    selectedStep,

    showTestErrorModal,
    testError,

    showTestSuccessModal,
    testSuccessMessage,

    showSessionModal,

    // Playwright
    playwrightPersonas,
    playwrightPersonasLoading,
    playwrightPersonaId,
    handleSelectPlaywrightPersona,
    handleSavePlaywrightSettings,
    showPlaywrightSaved,
    onOpenSessionModal,
  } = useIntegrationsContext();

  const [activeTab, setActiveTab] = useState('connections');
  
  if (!activeIntegration) return <></>;

  const integrationSlug = activeIntegration.slug;
  const isTradera = integrationSlug === 'tradera';
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const showPlaywright = isTradera;
  const showAllegroConsole = isAllegro;
  const showBaseConsole = isBaselinker;
  const activeConnection = connections[0] || null;
  const selectedPersona =
    playwrightPersonas.find((persona: PlaywrightPersona) => persona.id === playwrightPersonaId) ??
    null;

  return (
    <AppModal
      open={true}
      onClose={onCloseModal}
      title={
        <div className='flex items-center'>
          {activeIntegration.name} Integration
          {isTradera && (
            <span className='ml-2 rounded bg-orange-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-orange-200'>
              Browser
            </span>
          )}
          {isAllegro && (
            <span className='ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-blue-200'>
              API
            </span>
          )}
          {isBaselinker && (
            <span className='ml-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-purple-200'>
              Platform
            </span>
          )}
        </div>
      }
      subtitle={
        isBaselinker
          ? 'Manage connections and warehouse sync settings.'
          : isTradera
            ? 'Manage connections via browser automation (Playwright).'
            : 'Manage connections and marketplace API settings.'
      }
      headerActions={
        activeTab === 'playwright' && (
          <Button
            variant='primary'
            onClick={() => { void handleSavePlaywrightSettings(); }}
            className='min-w-[100px]'
          >
            Save
          </Button>
        )
      }
    >
      <Tabs defaultValue='connections' value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className={`grid w-full ${
            showPlaywright || showAllegroConsole || showBaseConsole
              ? 'grid-cols-5'
              : 'grid-cols-4'
          }`}
        >
          <TabsTrigger value='connections'>Connections</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
          {showAllegroConsole && (
            <TabsTrigger value='allegro-api'>Allegro API</TabsTrigger>
          )}
          {showBaseConsole && (
            <TabsTrigger value='base-api'>Base API</TabsTrigger>
          )}
          <TabsTrigger value='price-sync'>Price Sync</TabsTrigger>
          <TabsTrigger value='inventory-sync'>Inventory Sync</TabsTrigger>
          {showPlaywright && (
            <TabsTrigger value='playwright'>Playwright</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='connections' className='mt-4 space-y-6'>
          <ConnectionManager />
        </TabsContent>

        <TabsContent value='settings' className='mt-4'>
          {isAllegro ? (
            <AllegroSettings />
          ) : isBaselinker ? (
            <BaselinkerSettings />
          ) : (
            <div className='min-h-[220px]' />
          )}

          {isTradera && activeConnection && (
            <SectionPanel variant='subtle-compact' className='mt-4 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-3'>
                <p>
                  <span className='text-gray-400'>Session cookie:</span>{' '}
                  {activeConnection.hasPlaywrightStorageState
                    ? 'Retained'
                    : 'Not stored'}
                </p>
                <Button
                  type='button'
                  onClick={onOpenSessionModal}
                  disabled={!activeConnection.hasPlaywrightStorageState}
                  className='text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600'
                >
                      View details
                </Button>
              </div>
              <p className='mt-1'>
                <span className='text-gray-400'>Obtained:</span>{' '}
                {activeConnection.playwrightStorageStateUpdatedAt
                  ? new Date(
                    activeConnection.playwrightStorageStateUpdatedAt
                  ).toLocaleString()
                  : '—'}
              </p>
            </SectionPanel>
          )}
        </TabsContent>

        {showBaseConsole && (
          <TabsContent value='base-api' className='mt-4'>
            <BaseApiConsole />
          </TabsContent>
        )}

        {showAllegroConsole && (
          <TabsContent value='allegro-api' className='mt-4'>
            <AllegroApiConsole />
          </TabsContent>
        )}

        <TabsContent value='price-sync' className='mt-4'>
          <div className='min-h-[220px]' />
        </TabsContent>
        <TabsContent value='inventory-sync' className='mt-4'>
          <div className='min-h-[220px]' />
        </TabsContent>

        {showPlaywright && (
          <TabsContent value='playwright' className='mt-4 space-y-4'>
            <FormSection
              title='Playwright persona'
              description='Apply shared automation presets to this connection.'
              actions={(
                <Button variant='outline' size='sm' asChild>
                  <Link href='/admin/settings/playwright'>
                    Manage personas
                  </Link>
                </Button>
              )}
              className='p-4'
            >
              {playwrightPersonasLoading ? (
                <p className='mt-4 text-xs text-gray-500'>
                  Loading personas...
                </p>
              ) : playwrightPersonas.length === 0 ? (
                <p className='mt-4 text-xs text-gray-500'>
                  No personas yet. Create one in settings.
                </p>
              ) : (
                <div className='mt-4 grid gap-4 md:grid-cols-2'>
                  <FormField
                    label='Persona'
                    description='Selecting a persona overwrites the settings below.'
                  >
                    <UnifiedSelect
                      value={playwrightPersonaId ?? 'custom'}
                      onValueChange={(value: string): void => {
                        void handleSelectPlaywrightPersona(
                          value === 'custom' ? null : value
                        );
                      }}
                      options={[
                        { value: 'custom', label: 'Custom' },
                        ...playwrightPersonas.map((persona: PlaywrightPersona) => ({
                          value: persona.id,
                          label: persona.name
                        }))
                      ]}
                      placeholder='Select persona'
                    />
                  </FormField>
                  <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
                    {selectedPersona ? (
                      <>
                        <p className='text-xs font-semibold text-gray-200'>
                          {selectedPersona.name}
                        </p>
                        <p className='mt-1'>
                          {selectedPersona.description ||
                            'No description provided.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className='text-xs font-semibold text-gray-200'>
                          Custom settings
                        </p>
                        <p className='mt-1'>
                          Adjust the form below or apply a persona.
                        </p>
                      </>
                    )}
                  </FormSection>
                </div>
              )}
            </FormSection>

            <DynamicPlaywrightSettingsForm />
          </TabsContent>
        )}
      </Tabs>
      {showTestLogModal && selectedStep && (
        <TestLogModal />
      )}

      {(showTestErrorModal || showTestSuccessModal) && (testError || testSuccessMessage) && (
        <TestResultModal />
      )}

      {showSessionModal && (
        <SessionModal />
      )}
      {showPlaywrightSaved && (
        <div className='fixed right-6 top-6 z-[200] rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-100 shadow-lg'>
            Playwright settings saved
        </div>
      )}
    </AppModal>
  );
}
