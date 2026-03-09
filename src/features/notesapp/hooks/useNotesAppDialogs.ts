'use client';

import { useCallback, useState } from 'react';

import type { NotesAppActionsValue, NotesAppConfirmationState, NotesAppPromptState } from './NotesAppContext.types';

export function useNotesAppDialogs(): {
  confirmation: NotesAppConfirmationState | null;
  setConfirmation: NotesAppActionsValue['setConfirmation'];
  confirmAction: NotesAppActionsValue['confirmAction'];
  prompt: NotesAppPromptState | null;
  setPrompt: NotesAppActionsValue['setPrompt'];
  promptAction: NotesAppActionsValue['promptAction'];
  } {
  const [confirmation, setConfirmation] = useState<NotesAppConfirmationState | null>(null);
  const [prompt, setPrompt] = useState<NotesAppPromptState | null>(null);

  const confirmAction = useCallback<NotesAppActionsValue['confirmAction']>((config) => {
    setConfirmation(config);
  }, []);

  const promptAction = useCallback<NotesAppActionsValue['promptAction']>((config) => {
    setPrompt(config);
  }, []);

  return {
    confirmation,
    setConfirmation,
    confirmAction,
    prompt,
    setPrompt,
    promptAction,
  };
}
