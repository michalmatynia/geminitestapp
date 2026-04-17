'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import {
  connectionToProgrammableDraftMapperRows,
  connectionToProgrammableFieldMapperRows,
  parseProgrammableCaptureRouteConfigJson,
  type ProgrammableDraftMapperRow,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type {
  ProgrammableConnection,
  RunningTestType,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';

type DraftFields = {
  appearanceMode: string;
  automationFlowJson: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  connectionName: string;
  draftMapperRows: ProgrammableDraftMapperRow[];
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importBaseUrl: string;
  importScript: string;
  listingActionId: string;
  listingScript: string;
};

const readSelectedConnectionDraft = (
  selectedConnection: ProgrammableConnection | null
): DraftFields => {
  if (selectedConnection === null) {
    return {
      appearanceMode: '',
      automationFlowJson: '',
      captureRoutes: [],
      connectionName: '',
      draftMapperRows: [],
      fieldMapperRows: [],
      importActionId: '',
      importBaseUrl: '',
      importScript: '',
      listingActionId: '',
      listingScript: '',
    };
  }

  const captureConfig = parseProgrammableCaptureRouteConfigJson(
    selectedConnection.playwrightImportCaptureRoutesJson
  );

  return {
    appearanceMode: captureConfig.appearanceMode,
    automationFlowJson: selectedConnection.playwrightImportAutomationFlowJson ?? '',
    captureRoutes: captureConfig.routes,
    connectionName: selectedConnection.name,
    draftMapperRows: connectionToProgrammableDraftMapperRows(selectedConnection),
    fieldMapperRows: connectionToProgrammableFieldMapperRows(selectedConnection),
    importActionId: selectedConnection.playwrightImportActionId ?? '',
    importBaseUrl: selectedConnection.playwrightImportBaseUrl ?? '',
    importScript: selectedConnection.playwrightImportScript ?? '',
    listingActionId: selectedConnection.playwrightListingActionId ?? '',
    listingScript: selectedConnection.playwrightListingScript ?? '',
  };
};

const usePlaywrightProgrammableConnectionActivityState = (): {
  isCleaningAllLegacyBrowserFields: boolean;
  isCleaningLegacyBrowserFields: boolean;
  isPromotingConnectionSettings: boolean;
  promotionProxyPassword: string;
  runningTestType: RunningTestType;
  setIsCleaningAllLegacyBrowserFields: Dispatch<SetStateAction<boolean>>;
  setIsCleaningLegacyBrowserFields: Dispatch<SetStateAction<boolean>>;
  setIsPromotingConnectionSettings: Dispatch<SetStateAction<boolean>>;
  setPromotionProxyPassword: Dispatch<SetStateAction<string>>;
  setRunningTestType: Dispatch<SetStateAction<RunningTestType>>;
  setTestResultJson: Dispatch<SetStateAction<string>>;
  testResultJson: string;
} => {
  const [promotionProxyPassword, setPromotionProxyPassword] = useState('');
  const [testResultJson, setTestResultJson] = useState('');
  const [runningTestType, setRunningTestType] = useState<RunningTestType>(null);
  const [isPromotingConnectionSettings, setIsPromotingConnectionSettings] = useState(false);
  const [isCleaningLegacyBrowserFields, setIsCleaningLegacyBrowserFields] = useState(false);
  const [isCleaningAllLegacyBrowserFields, setIsCleaningAllLegacyBrowserFields] =
    useState(false);

  return {
    isCleaningAllLegacyBrowserFields,
    isCleaningLegacyBrowserFields,
    isPromotingConnectionSettings,
    promotionProxyPassword,
    runningTestType,
    setIsCleaningAllLegacyBrowserFields,
    setIsCleaningLegacyBrowserFields,
    setIsPromotingConnectionSettings,
    setPromotionProxyPassword,
    setRunningTestType,
    setTestResultJson,
    testResultJson,
  };
};

export const usePlaywrightProgrammableConnectionDraft = (
  selectedConnection: ProgrammableConnection | null
): DraftFields & ReturnType<typeof usePlaywrightProgrammableConnectionActivityState> & {
    setAppearanceMode: Dispatch<SetStateAction<string>>;
    setAutomationFlowJson: Dispatch<SetStateAction<string>>;
    setCaptureRoutes: Dispatch<SetStateAction<PlaywrightConfigCaptureRoute[]>>;
    setConnectionName: Dispatch<SetStateAction<string>>;
    setDraftMapperRows: Dispatch<SetStateAction<ProgrammableDraftMapperRow[]>>;
    setFieldMapperRows: Dispatch<SetStateAction<ProgrammableFieldMapperRow[]>>;
    setImportActionId: Dispatch<SetStateAction<string>>;
    setImportBaseUrl: Dispatch<SetStateAction<string>>;
    setImportScript: Dispatch<SetStateAction<string>>;
    setListingActionId: Dispatch<SetStateAction<string>>;
    setListingScript: Dispatch<SetStateAction<string>>;
  } => {
  const activityState = usePlaywrightProgrammableConnectionActivityState();
  const [connectionName, setConnectionName] = useState('');
  const [listingScript, setListingScript] = useState('');
  const [importScript, setImportScript] = useState('');
  const [importBaseUrl, setImportBaseUrl] = useState('');
  const [automationFlowJson, setAutomationFlowJson] = useState('');
  const [listingActionId, setListingActionId] = useState('');
  const [importActionId, setImportActionId] = useState('');
  const [captureRoutes, setCaptureRoutes] = useState<PlaywrightConfigCaptureRoute[]>([]);
  const [appearanceMode, setAppearanceMode] = useState('');
  const [draftMapperRows, setDraftMapperRows] = useState<ProgrammableDraftMapperRow[]>([]);
  const [fieldMapperRows, setFieldMapperRows] = useState<ProgrammableFieldMapperRow[]>([]);

  useEffect(() => {
    const draft = readSelectedConnectionDraft(selectedConnection);

    setAppearanceMode(draft.appearanceMode);
    setAutomationFlowJson(draft.automationFlowJson);
    setCaptureRoutes(draft.captureRoutes);
    setConnectionName(draft.connectionName);
    setDraftMapperRows(draft.draftMapperRows);
    setFieldMapperRows(draft.fieldMapperRows);
    setImportActionId(draft.importActionId);
    setImportBaseUrl(draft.importBaseUrl);
    setImportScript(draft.importScript);
    setListingActionId(draft.listingActionId);
    setListingScript(draft.listingScript);
    activityState.setTestResultJson('');
  }, [activityState.setTestResultJson, selectedConnection]);

  return {
    ...activityState,
    appearanceMode,
    automationFlowJson,
    captureRoutes,
    connectionName,
    draftMapperRows,
    fieldMapperRows,
    importActionId,
    importBaseUrl,
    importScript,
    listingActionId,
    listingScript,
    setAppearanceMode,
    setAutomationFlowJson,
    setCaptureRoutes,
    setConnectionName,
    setDraftMapperRows,
    setFieldMapperRows,
    setImportActionId,
    setImportBaseUrl,
    setImportScript,
    setListingActionId,
    setListingScript,
  };
};
