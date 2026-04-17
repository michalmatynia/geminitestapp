'use client';

import { useEffect, useState } from 'react';

import {
  connectionToProgrammableFieldMapperRows,
  parseProgrammableCaptureRouteConfigJson,
  type ProgrammableFieldMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type {
  ProgrammableConnection,
  RunningTestType,
} from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes/external-nodes';

export const usePlaywrightProgrammableConnectionDraft = (
  selectedConnection: ProgrammableConnection | null
): {
  appearanceMode: string;
  captureRoutes: PlaywrightConfigCaptureRoute[];
  connectionName: string;
  fieldMapperRows: ProgrammableFieldMapperRow[];
  importActionId: string;
  importBaseUrl: string;
  importScript: string;
  listingActionId: string;
  listingScript: string;
  promotionProxyPassword: string;
  runningTestType: RunningTestType;
  setAppearanceMode: React.Dispatch<React.SetStateAction<string>>;
  setCaptureRoutes: React.Dispatch<React.SetStateAction<PlaywrightConfigCaptureRoute[]>>;
  setConnectionName: React.Dispatch<React.SetStateAction<string>>;
  setFieldMapperRows: React.Dispatch<React.SetStateAction<ProgrammableFieldMapperRow[]>>;
  setImportActionId: React.Dispatch<React.SetStateAction<string>>;
  setImportBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  setImportScript: React.Dispatch<React.SetStateAction<string>>;
  setListingActionId: React.Dispatch<React.SetStateAction<string>>;
  setListingScript: React.Dispatch<React.SetStateAction<string>>;
  setPromotionProxyPassword: React.Dispatch<React.SetStateAction<string>>;
  setRunningTestType: React.Dispatch<React.SetStateAction<RunningTestType>>;
  setTestResultJson: React.Dispatch<React.SetStateAction<string>>;
  testResultJson: string;
} => {
  const [connectionName, setConnectionName] = useState('');
  const [listingScript, setListingScript] = useState('');
  const [importScript, setImportScript] = useState('');
  const [importBaseUrl, setImportBaseUrl] = useState('');
  const [listingActionId, setListingActionId] = useState('');
  const [importActionId, setImportActionId] = useState('');
  const [captureRoutes, setCaptureRoutes] = useState<PlaywrightConfigCaptureRoute[]>([]);
  const [appearanceMode, setAppearanceMode] = useState('');
  const [fieldMapperRows, setFieldMapperRows] = useState<ProgrammableFieldMapperRow[]>([]);
  const [promotionProxyPassword, setPromotionProxyPassword] = useState('');
  const [testResultJson, setTestResultJson] = useState('');
  const [runningTestType, setRunningTestType] = useState<RunningTestType>(null);

  useEffect(() => {
    const captureConfig = parseProgrammableCaptureRouteConfigJson(
      selectedConnection?.playwrightImportCaptureRoutesJson
    );

    setConnectionName(selectedConnection?.name ?? '');
    setListingScript(selectedConnection?.playwrightListingScript ?? '');
    setImportScript(selectedConnection?.playwrightImportScript ?? '');
    setImportBaseUrl(selectedConnection?.playwrightImportBaseUrl ?? '');
    setListingActionId(selectedConnection?.playwrightListingActionId ?? '');
    setImportActionId(selectedConnection?.playwrightImportActionId ?? '');
    setCaptureRoutes(captureConfig.routes);
    setAppearanceMode(captureConfig.appearanceMode);
    setFieldMapperRows(connectionToProgrammableFieldMapperRows(selectedConnection));
    setTestResultJson('');
  }, [selectedConnection]);

  return {
    appearanceMode,
    captureRoutes,
    connectionName,
    fieldMapperRows,
    importActionId,
    importBaseUrl,
    importScript,
    listingActionId,
    listingScript,
    promotionProxyPassword,
    runningTestType,
    setAppearanceMode,
    setCaptureRoutes,
    setConnectionName,
    setFieldMapperRows,
    setImportActionId,
    setImportBaseUrl,
    setImportScript,
    setListingActionId,
    setListingScript,
    setPromotionProxyPassword,
    setRunningTestType,
    setTestResultJson,
    testResultJson,
  };
};
