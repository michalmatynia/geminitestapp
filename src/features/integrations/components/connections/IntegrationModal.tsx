'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { Tabs, TabsContent, AppModal } from '@/shared/ui';

import { ConnectionManager } from './ConnectionManager';
import { SessionModal } from './SessionModal';
import { TestLogModal } from './TestLogModal';
import { TestResultModal } from './TestResultModal';
import { DynamicPlaywrightSettingsForm } from './DynamicPlaywrightSettingsForm';
import { PlaywrightTabContent } from './PlaywrightTabContent';
import { useIntegrationTabs } from './hooks/useIntegrationTabs';
import { IntegrationModalHeader } from './integration-modal/IntegrationModalHeader';
import { IntegrationModalSubtitle } from './integration-modal/IntegrationModalSubtitle';
import { IntegrationModalHeaderActions } from './integration-modal/IntegrationModalHeaderActions';
import { IntegrationTabsList } from './integration-modal/IntegrationTabsList';
import { IntegrationSettingsContent } from './integration-modal/IntegrationSettingsContent';
import { AllegroApiConsole } from './AllegroApiConsole';
import { BaseApiConsole } from './BaseApiConsole';

export function IntegrationModal(): React.JSX.Element {
  const { activeIntegration, onCloseModal, showTestLogModal, selectedStep, showTestErrorModal, testError, showTestSuccessModal, testSuccessMessage, showSessionModal, showPlaywrightSaved, onOpenSessionModal } = useIntegrationsContext();

  const {
    activeTab,
    setActiveTab,
    integrationSlug,
    isTradera,
    isAllegro,
    isBaselinker,
    showPlaywright,
    showAllegroConsole,
    showBaseConsole,
    activeConnection,
    handleSavePlaywrightSettings,
  } = useIntegrationTabs();

  if (!activeIntegration) return <></>;

  return (
    <AppModal
      open={true}
      onClose={onCloseModal}
      title={
        <IntegrationModalHeader
          integrationName={activeIntegration.name}
          isTradera={isTradera}
          isAllegro={isAllegro}
          isBaselinker={isBaselinker}
        />
      }
      subtitle={IntegrationModalSubtitle({ isBaselinker, isTradera })}
      headerActions={
        <IntegrationModalHeaderActions
          activeTab={activeTab}
          onSave={() => {
            void handleSavePlaywrightSettings();
          }}
        />
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <IntegrationTabsList
          showAllegroConsole={showAllegroConsole}
          showBaseConsole={showBaseConsole}
          showPlaywright={showPlaywright}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <TabsContent value='connections' className='mt-4 space-y-6'>
          <ConnectionManager />
        </TabsContent>

        <TabsContent value='settings' className='mt-4'>
          <IntegrationSettingsContent
            isAllegro={isAllegro}
            isBaselinker={isBaselinker}
            isTradera={isTradera}
            activeConnection={activeConnection}
            onOpenSessionModal={onOpenSessionModal}
          />
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

      {showTestLogModal && selectedStep && <TestLogModal />}

      {(showTestErrorModal || showTestSuccessModal) && (testError || testSuccessMessage) && (
        <TestResultModal />
      )}

      {showSessionModal && <SessionModal />}

      {showPlaywrightSaved && (
        <div className='fixed right-6 top-6 z-[200] rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-100 shadow-lg'>
          Playwright settings saved
        </div>
      )}
    </AppModal>
  );
}
