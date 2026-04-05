'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsSession,
  useIntegrationsTesting,
} from '@/features/integrations/context/IntegrationsContext';
import { Tabs, TabsContent } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/FormModal';

import { AllegroApiConsole } from './AllegroApiConsole';
import { BaseApiConsole } from './BaseApiConsole';
import { ConnectionManager } from './ConnectionManager';
import { useIntegrationTabs } from './hooks/useIntegrationTabs';
import { IntegrationModalHeader } from './integration-modal/IntegrationModalHeader';
import { IntegrationModalSubtitle } from './integration-modal/IntegrationModalSubtitle';
import {
  IntegrationModalViewProvider,
  type IntegrationModalViewContextValue,
} from './integration-modal/IntegrationModalViewContext';
import { IntegrationSettingsContent } from './integration-modal/IntegrationSettingsContent';
import { IntegrationTabsList } from './integration-modal/IntegrationTabsList';
import { PlaywrightTabContent } from './PlaywrightTabContent';
import { SessionModal } from './SessionModal';
import { TestLogModal } from './TestLogModal';
import { TestResultModal } from './TestResultModal';

export function IntegrationModal(): React.JSX.Element {
  const { activeIntegration } = useIntegrationsData();
  const { onCloseModal, onOpenSessionModal } = useIntegrationsActions();
  const {
    showTestLogModal,
    setShowTestLogModal,
    showTestErrorModal,
    setShowTestErrorModal,
    showTestSuccessModal,
    setShowTestSuccessModal,
  } = useIntegrationsTesting();
  const { showSessionModal, setShowSessionModal } = useIntegrationsSession();
  const [isSaving, setIsSaving] = useState(false);

  const {
    activeTab,
    setActiveTab,
    isTradera,
    isAllegro,
    isLinkedIn,
    isBaselinker,
    showPlaywright,
    showAllegroConsole,
    showBaseConsole,
    activeConnection,
    handleSavePlaywrightSettings,
  } = useIntegrationTabs();

  const canSaveBrowserSettings = isTradera && showPlaywright;

  const handleSave = useCallback(async (): Promise<void> => {
    if (!canSaveBrowserSettings || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await handleSavePlaywrightSettings();
    } finally {
      setIsSaving(false);
    }
  }, [canSaveBrowserSettings, handleSavePlaywrightSettings, isSaving]);

  if (!activeIntegration) return <></>;

  const modalViewContextValue: IntegrationModalViewContextValue = useMemo(
    () => ({
      integrationName: activeIntegration.name,
      activeTab,
      isTradera,
      isAllegro,
      isLinkedIn,
      isBaselinker,
      showPlaywright,
      showAllegroConsole,
      showBaseConsole,
      activeConnection,
      onOpenSessionModal,
      onSavePlaywrightSettings: () => {
        void handleSave();
      },
    }),
    [
      activeConnection,
      activeIntegration.name,
      activeTab,
      handleSave,
      isAllegro,
      isLinkedIn,
      isBaselinker,
      isTradera,
      onOpenSessionModal,
      showAllegroConsole,
      showBaseConsole,
      showPlaywright,
    ]
  );

  return (
    <IntegrationModalViewProvider value={modalViewContextValue}>
      <FormModal
        isOpen={true}
        onClose={onCloseModal}
        title={<IntegrationModalHeader />}
        subtitle={<IntegrationModalSubtitle />}
        onSave={() => void handleSave()}
        isSaving={isSaving}
        disableCloseWhileSaving={canSaveBrowserSettings}
        showSaveButton={canSaveBrowserSettings}
        showCancelButton={true}
        cancelText='Close'
        saveText='Save'
        size='xl'
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <IntegrationTabsList />

          <TabsContent value='connections' className='mt-4 space-y-6'>
            <ConnectionManager />
          </TabsContent>

          <TabsContent value='settings' className='mt-4'>
            <IntegrationSettingsContent />
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
              <PlaywrightTabContent />
            </TabsContent>
          )}
        </Tabs>

        <TestLogModal isOpen={showTestLogModal} onClose={() => setShowTestLogModal(false)} />

        <TestResultModal
          isOpen={showTestErrorModal || showTestSuccessModal}
          onClose={() => {
            setShowTestErrorModal(false);
            setShowTestSuccessModal(false);
          }}
        />

        <SessionModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
      </FormModal>
    </IntegrationModalViewProvider>
  );
}
