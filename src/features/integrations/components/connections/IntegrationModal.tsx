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

type IntegrationModalPanelsProps = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  showAllegroConsole: boolean;
  showBaseConsole: boolean;
  showPlaywright: boolean;
};

type IntegrationModalDialogsProps = {
  showSessionModal: boolean;
  setShowSessionModal: (show: boolean) => void;
  showTestErrorModal: boolean;
  setShowTestErrorModal: (show: boolean) => void;
  showTestLogModal: boolean;
  setShowTestLogModal: (show: boolean) => void;
  showTestSuccessModal: boolean;
  setShowTestSuccessModal: (show: boolean) => void;
};

type IntegrationModalFrameProps = {
  onCloseModal: () => void;
  showAllegroConsole: boolean;
  showBaseConsole: boolean;
  showPlaywright: boolean;
  activeTab: string;
  setActiveTab: (value: string) => void;
  dialogs: IntegrationModalDialogsProps;
};

function IntegrationModalPanels({
  activeTab,
  setActiveTab,
  showAllegroConsole,
  showBaseConsole,
  showPlaywright,
}: IntegrationModalPanelsProps): React.JSX.Element {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <IntegrationTabsList />

      <TabsContent value='connections' className='mt-4 space-y-6'>
        <ConnectionManager />
      </TabsContent>

      <TabsContent value='settings' className='mt-4'>
        <IntegrationSettingsContent />
      </TabsContent>

      {showBaseConsole ? (
        <TabsContent value='base-api' className='mt-4'>
          <BaseApiConsole />
        </TabsContent>
      ) : null}

      {showAllegroConsole ? (
        <TabsContent value='allegro-api' className='mt-4'>
          <AllegroApiConsole />
        </TabsContent>
      ) : null}

      <TabsContent value='price-sync' className='mt-4'>
        <div className='min-h-[220px]' />
      </TabsContent>
      <TabsContent value='inventory-sync' className='mt-4'>
        <div className='min-h-[220px]' />
      </TabsContent>

      {showPlaywright ? (
        <TabsContent value='playwright' className='mt-4 space-y-4'>
          <PlaywrightTabContent />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

function IntegrationModalDialogs({
  showSessionModal,
  setShowSessionModal,
  showTestErrorModal,
  setShowTestErrorModal,
  showTestLogModal,
  setShowTestLogModal,
  showTestSuccessModal,
  setShowTestSuccessModal,
}: IntegrationModalDialogsProps): React.JSX.Element {
  return (
    <>
      <TestLogModal isOpen={showTestLogModal} onClose={() => setShowTestLogModal(false)} />

      <TestResultModal
        isOpen={showTestErrorModal || showTestSuccessModal}
        onClose={() => {
          setShowTestErrorModal(false);
          setShowTestSuccessModal(false);
        }}
      />

      <SessionModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
    </>
  );
}

function IntegrationModalFrame({
  onCloseModal,
  showAllegroConsole,
  showBaseConsole,
  showPlaywright,
  activeTab,
  setActiveTab,
  dialogs,
}: IntegrationModalFrameProps): React.JSX.Element {
  return (
    <FormModal
      isOpen={true}
      onClose={onCloseModal}
      title={<IntegrationModalHeader />}
      subtitle={<IntegrationModalSubtitle />}
      onSave={() => undefined}
      isSaving={false}
      disableCloseWhileSaving={false}
      showSaveButton={false}
      showCancelButton={true}
      cancelText='Close'
      saveText='Save'
      size='xl'
    >
      <IntegrationModalPanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showAllegroConsole={showAllegroConsole}
        showBaseConsole={showBaseConsole}
        showPlaywright={showPlaywright}
      />
      <IntegrationModalDialogs {...dialogs} />
    </FormModal>
  );
}

export function IntegrationModal(): React.JSX.Element {
  const { activeIntegration } = useIntegrationsData();
  const { onCloseModal, onOpenSessionModal } = useIntegrationsActions();
  const testing = useIntegrationsTesting();
  const session = useIntegrationsSession();
  const tabs = useIntegrationTabs();
  if (!activeIntegration) return <></>;

  const modalViewContextValue: IntegrationModalViewContextValue = useMemo(
    () => ({
      integrationName: activeIntegration.name,
      activeTab: tabs.activeTab,
      isTradera: tabs.isTradera,
      isVinted: tabs.isVinted,
      is1688: tabs.is1688,
      isAllegro: tabs.isAllegro,
      isLinkedIn: tabs.isLinkedIn,
      isBaselinker: tabs.isBaselinker,
      showPlaywright: tabs.showPlaywright,
      showAllegroConsole: tabs.showAllegroConsole,
      showBaseConsole: tabs.showBaseConsole,
      activeConnection: tabs.activeConnection,
      onOpenSessionModal,
    }),
    [activeIntegration.name, onOpenSessionModal, tabs]
  );

  return (
    <IntegrationModalViewProvider value={modalViewContextValue}>
      <IntegrationModalFrame
        onCloseModal={onCloseModal}
        showAllegroConsole={tabs.showAllegroConsole}
        showBaseConsole={tabs.showBaseConsole}
        showPlaywright={tabs.showPlaywright}
        activeTab={tabs.activeTab}
        setActiveTab={tabs.setActiveTab}
        dialogs={{
          showSessionModal: session.showSessionModal,
          setShowSessionModal: session.setShowSessionModal,
          showTestErrorModal: testing.showTestErrorModal,
          setShowTestErrorModal: testing.setShowTestErrorModal,
          showTestLogModal: testing.showTestLogModal,
          setShowTestLogModal: testing.setShowTestLogModal,
          showTestSuccessModal: testing.showTestSuccessModal,
          setShowTestSuccessModal: testing.setShowTestSuccessModal,
        }}
      />
    </IntegrationModalViewProvider>
  );
}
