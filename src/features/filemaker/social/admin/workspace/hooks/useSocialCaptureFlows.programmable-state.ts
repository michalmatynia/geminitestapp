'use client';

import { useCallback, useState } from 'react';

import {
  buildSocialPublishingProgrammableCaptureRoutesFromPresetIds,
  SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/filemaker/social/shared/social-playwright-capture';
import type { SocialPublishingProgrammableCaptureRoute } from '@/shared/contracts/social-publishing-image-addons';

import { useProgrammableCaptureRouteHandlers } from './useSocialCaptureFlows.programmable-route-handlers';
import {
  type OpenProgrammablePlaywrightModalOptions,
  resolveDefaultProgrammableRoutes,
  resolveNonEmptyString,
  resolveProgrammableRoutesForOpen,
  resolveProgrammableTextField,
  trimToNullableString,
} from './useSocialCaptureFlows.programmable-state-runtime';
import type {
  SocialCaptureFlowsProps,
  SocialProgrammableCaptureControls,
  SocialProgrammableCaptureState,
} from './useSocialCaptureFlows.types';

type UseSocialProgrammableCaptureStateParams = {
  settings: SocialCaptureFlowsProps['settings'];
  clearCaptureOnlyFeedback: () => void;
};

type ProgrammableCaptureOpenValuesParams = {
  settings: SocialCaptureFlowsProps['settings'];
  state: SocialProgrammableCaptureState;
  loadPersistedDefaults: boolean;
};

const useProgrammableCaptureCoreState = (
  settings: SocialCaptureFlowsProps['settings']
): SocialProgrammableCaptureState => {
  const [isProgrammablePlaywrightModalOpen, setIsProgrammablePlaywrightModalOpen] =
    useState(false);
  const [programmableCaptureBaseUrl, setProgrammableCaptureBaseUrl] = useState(
    settings.persistedSocialSettings.programmableCaptureBaseUrl ?? settings.batchCaptureBaseUrl
  );
  const [programmableCapturePersonaId, setProgrammableCapturePersonaId] = useState(
    settings.persistedSocialSettings.programmableCapturePersonaId ?? ''
  );
  const [programmableCaptureScript, setProgrammableCaptureScript] = useState(
    resolveNonEmptyString(
      settings.persistedSocialSettings.programmableCaptureScript,
      SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
    )
  );
  const [programmableCaptureRoutes, setProgrammableCaptureRoutes] = useState<
    SocialPublishingProgrammableCaptureRoute[]
  >(() =>
    resolveDefaultProgrammableRoutes({
      persistedRoutes: settings.persistedSocialSettings.programmableCaptureRoutes,
      presetIds: settings.batchCapturePresetIds,
    })
  );
  const [programmableCapturePending, setProgrammableCapturePending] = useState(false);
  const [programmableCaptureMessage, setProgrammableCaptureMessage] = useState<string | null>(null);
  const [programmableCaptureErrorMessage, setProgrammableCaptureErrorMessage] =
    useState<string | null>(null);
  const [programmableCaptureBatchCaptureJob, setProgrammableCaptureBatchCaptureJob] =
    useState<SocialCaptureFlowsProps['imageAddons']['batchCaptureJob']>(null);

  return {
    isProgrammablePlaywrightModalOpen,
    setIsProgrammablePlaywrightModalOpen,
    programmableCaptureBaseUrl,
    setProgrammableCaptureBaseUrl,
    programmableCapturePersonaId,
    setProgrammableCapturePersonaId,
    programmableCaptureScript,
    setProgrammableCaptureScript,
    programmableCaptureRoutes,
    setProgrammableCaptureRoutes,
    programmableCapturePending,
    setProgrammableCapturePending,
    programmableCaptureMessage,
    setProgrammableCaptureMessage,
    programmableCaptureErrorMessage,
    setProgrammableCaptureErrorMessage,
    programmableCaptureBatchCaptureJob,
    setProgrammableCaptureBatchCaptureJob,
  };
};

const applyProgrammableCaptureOpenValues = ({
  settings,
  state,
  loadPersistedDefaults,
}: ProgrammableCaptureOpenValuesParams): void => {
  const persistedBaseUrl = settings.persistedSocialSettings.programmableCaptureBaseUrl ?? '';
  const persistedPersonaId = settings.persistedSocialSettings.programmableCapturePersonaId ?? '';
  const persistedScript = settings.persistedSocialSettings.programmableCaptureScript;

  state.setProgrammableCaptureBaseUrl((current) =>
    resolveProgrammableTextField({
      current,
      persisted: persistedBaseUrl,
      fallback: settings.batchCaptureBaseUrl,
      loadPersistedDefaults,
    })
  );
  state.setProgrammableCapturePersonaId((current) =>
    resolveProgrammableTextField({ current, persisted: persistedPersonaId, fallback: '', loadPersistedDefaults })
  );
  state.setProgrammableCaptureScript((current) =>
    resolveProgrammableTextField({
      current,
      persisted: persistedScript,
      fallback: SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
      loadPersistedDefaults,
    })
  );
  state.setProgrammableCaptureRoutes((current) =>
    resolveProgrammableRoutesForOpen({
      current,
      persistedRoutes: settings.persistedSocialSettings.programmableCaptureRoutes,
      presetIds: settings.batchCapturePresetIds,
      loadPersistedDefaults,
    })
  );
};

const useOpenProgrammablePlaywrightModal = ({
  settings,
  clearCaptureOnlyFeedback,
  state,
}: UseSocialProgrammableCaptureStateParams & {
  state: SocialProgrammableCaptureState;
}): ((options?: OpenProgrammablePlaywrightModalOptions) => void) =>
  useCallback(
    (options?: OpenProgrammablePlaywrightModalOptions): void => {
      const loadPersistedDefaults = options?.loadPersistedDefaults === true;

      clearCaptureOnlyFeedback();
      state.setProgrammableCaptureMessage(null);
      state.setProgrammableCaptureErrorMessage(null);
      state.setProgrammableCaptureBatchCaptureJob(null);
      applyProgrammableCaptureOpenValues({ settings, state, loadPersistedDefaults });
      state.setIsProgrammablePlaywrightModalOpen(true);
    },
    [
      clearCaptureOnlyFeedback,
      settings.batchCaptureBaseUrl,
      settings.batchCapturePresetIds,
      settings.persistedSocialSettings.programmableCaptureBaseUrl,
      settings.persistedSocialSettings.programmableCapturePersonaId,
      settings.persistedSocialSettings.programmableCaptureRoutes,
      settings.persistedSocialSettings.programmableCaptureScript,
      state,
    ]
  );

const useProgrammableCaptureModalHandlers = ({
  openProgrammablePlaywrightModal,
  state,
}: {
  openProgrammablePlaywrightModal: (options?: OpenProgrammablePlaywrightModalOptions) => void;
  state: SocialProgrammableCaptureState;
}): Pick<
  SocialProgrammableCaptureControls,
  | 'handleOpenProgrammablePlaywrightModal'
  | 'handleOpenProgrammablePlaywrightModalFromDefaults'
  | 'handleCloseProgrammablePlaywrightModal'
> => {
  const handleOpenProgrammablePlaywrightModal = useCallback((): void => {
    openProgrammablePlaywrightModal();
  }, [openProgrammablePlaywrightModal]);

  const handleOpenProgrammablePlaywrightModalFromDefaults = useCallback((): void => {
    openProgrammablePlaywrightModal({ loadPersistedDefaults: true });
  }, [openProgrammablePlaywrightModal]);

  const handleCloseProgrammablePlaywrightModal = useCallback((): void => {
    if (state.programmableCapturePending) {
      return;
    }
    state.setIsProgrammablePlaywrightModalOpen(false);
  }, [state]);

  return {
    handleOpenProgrammablePlaywrightModal,
    handleOpenProgrammablePlaywrightModalFromDefaults,
    handleCloseProgrammablePlaywrightModal,
  };
};

const useProgrammableCaptureDefaultHandlers = ({
  settings,
  state,
}: {
  settings: SocialCaptureFlowsProps['settings'];
  state: SocialProgrammableCaptureState;
}): Pick<
  SocialProgrammableCaptureControls,
  'handleSaveProgrammableCaptureDefaults' | 'handleResetProgrammableCaptureDefaults'
> => {
  const handleSaveProgrammableCaptureDefaults = useCallback(async (): Promise<void> => {
    await settings.handleSaveProgrammableCaptureDefaults({
      baseUrl: trimToNullableString(state.programmableCaptureBaseUrl),
      personaId: trimToNullableString(state.programmableCapturePersonaId),
      script: state.programmableCaptureScript,
      routes: state.programmableCaptureRoutes,
    });
  }, [settings, state]);

  const handleResetProgrammableCaptureDefaults = useCallback(async (): Promise<void> => {
    const didSave = await settings.handleSaveProgrammableCaptureDefaults({
      baseUrl: null,
      personaId: null,
      script: SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
      routes: [],
    });
    if (!didSave) {
      return;
    }
    state.setProgrammableCaptureBaseUrl(settings.batchCaptureBaseUrl);
    state.setProgrammableCapturePersonaId('');
    state.setProgrammableCaptureScript(SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT);
    state.setProgrammableCaptureRoutes(
      buildSocialPublishingProgrammableCaptureRoutesFromPresetIds(settings.batchCapturePresetIds)
    );
    state.setProgrammableCaptureMessage(null);
    state.setProgrammableCaptureErrorMessage(null);
  }, [settings, state]);

  return {
    handleSaveProgrammableCaptureDefaults,
    handleResetProgrammableCaptureDefaults,
  };
};

export const useSocialProgrammableCaptureState = ({
  settings,
  clearCaptureOnlyFeedback,
}: UseSocialProgrammableCaptureStateParams): SocialProgrammableCaptureControls => {
  const state = useProgrammableCaptureCoreState(settings);
  const openProgrammablePlaywrightModal = useOpenProgrammablePlaywrightModal({
    settings,
    clearCaptureOnlyFeedback,
    state,
  });
  const modalHandlers = useProgrammableCaptureModalHandlers({
    openProgrammablePlaywrightModal,
    state,
  });
  const routeHandlers = useProgrammableCaptureRouteHandlers({ settings, state });
  const defaultHandlers = useProgrammableCaptureDefaultHandlers({ settings, state });

  return {
    ...state,
    ...modalHandlers,
    ...routeHandlers,
    ...defaultHandlers,
  };
};
