'use client';

import { useEffect, useMemo, useState } from 'react';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { usePlaywrightLiveScripter } from '../../hooks/usePlaywrightLiveScripter';

type Options = {
  initialUrl?: string | null;
  initialWebsiteId?: string | null;
  initialFlowId?: string | null;
  initialPersonaId?: string | null;
};

type LiveScripterPanelModel = {
  sequencer: ReturnType<typeof usePlaywrightStepSequencer>;
  personas: NonNullable<ReturnType<typeof usePlaywrightPersonas>['data']>;
  liveScripter: ReturnType<typeof usePlaywrightLiveScripter>;
  urlInput: string;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  typingValue: string;
  setTypingValue: React.Dispatch<React.SetStateAction<string>>;
  personaId: string | null;
  setPersonaId: React.Dispatch<React.SetStateAction<string | null>>;
  flowsForWebsite: ReturnType<typeof usePlaywrightStepSequencer>['flows'];
  handleStartOrNavigate: () => void;
  handleDispose: () => void;
  handleDriveType: () => void;
  handleWebsiteChange: (websiteId: string | null) => void;
};

type LiveScripterPanelActions = Pick<
  LiveScripterPanelModel,
  'handleStartOrNavigate' | 'handleDispose' | 'handleDriveType' | 'handleWebsiteChange'
>;

function useLiveScripterPanelActions({
  liveScripter,
  urlInput,
  sequencer,
  personaId,
  typingValue,
  setTypingValue,
}: {
  liveScripter: ReturnType<typeof usePlaywrightLiveScripter>;
  urlInput: string;
  sequencer: ReturnType<typeof usePlaywrightStepSequencer>;
  personaId: string | null;
  typingValue: string;
  setTypingValue: React.Dispatch<React.SetStateAction<string>>;
}): LiveScripterPanelActions {
  const handleStartOrNavigate = (): void => {
    if (liveScripter.status === 'live') {
      liveScripter.navigate(urlInput);
      return;
    }
    liveScripter
      .start(urlInput, {
        websiteId: sequencer.filterWebsiteId,
        flowId: sequencer.filterFlowId,
        personaId,
      })
      .catch(() => undefined);
  };

  return {
    handleStartOrNavigate,
    handleDispose: (): void => {
      liveScripter.dispose().catch(() => undefined);
    },
    handleDriveType: (): void => {
      liveScripter.driveType(typingValue);
      setTypingValue('');
    },
    handleWebsiteChange: (websiteId: string | null): void => {
      sequencer.setFilterWebsiteId(websiteId);
      sequencer.setFilterFlowId(null);
    },
  };
}

export function useLiveScripterPanelModel({
  initialUrl = null,
  initialWebsiteId = null,
  initialFlowId = null,
  initialPersonaId = null,
}: Options): LiveScripterPanelModel {
  const sequencer = usePlaywrightStepSequencer();
  const personasQuery = usePlaywrightPersonas();
  const liveScripter = usePlaywrightLiveScripter();
  const [urlInput, setUrlInput] = useState(initialUrl ?? '');
  const [typingValue, setTypingValue] = useState('');
  const [personaId, setPersonaId] = useState<string | null>(initialPersonaId ?? null);

  useEffect(() => {
    if (initialWebsiteId !== null && sequencer.filterWebsiteId === null) {
      sequencer.setFilterWebsiteId(initialWebsiteId);
    }
    if (initialFlowId !== null && sequencer.filterFlowId === null) {
      sequencer.setFilterFlowId(initialFlowId);
    }
  }, [initialFlowId, initialWebsiteId, sequencer]);

  useEffect(() => {
    if (liveScripter.currentUrl.length > 0) {
      setUrlInput(liveScripter.currentUrl);
    }
  }, [liveScripter.currentUrl]);

  const flowsForWebsite = useMemo(
    () =>
      sequencer.flows.filter(
        (flow) =>
          sequencer.filterWebsiteId === null || flow.websiteId === sequencer.filterWebsiteId
      ),
    [sequencer.filterWebsiteId, sequencer.flows]
  );

  const actions = useLiveScripterPanelActions({
    liveScripter,
    urlInput,
    sequencer,
    personaId,
    typingValue,
    setTypingValue,
  });

  return {
    sequencer,
    personas: personasQuery.data ?? [],
    liveScripter,
    urlInput,
    setUrlInput,
    typingValue,
    setTypingValue,
    personaId,
    setPersonaId,
    flowsForWebsite,
    ...actions,
  };
}
