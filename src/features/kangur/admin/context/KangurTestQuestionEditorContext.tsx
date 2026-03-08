'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { QuestionFormData } from '../../test-questions';
import type { KangurQuestionIllustration, KangurTestChoice } from '@/shared/contracts/kangur-tests';
import { internalError } from '@/shared/errors/app-error';

type KangurTestQuestionEditorContextValue = {
  formData: QuestionFormData;
  onChange: (next: QuestionFormData) => void;
  suiteTitle?: string;
  choices: KangurTestChoice[];
  correctChoiceLabel: string;
  updateFormData: (patch: Partial<QuestionFormData>) => void;
  setChoices: (choices: KangurTestChoice[]) => void;
  setCorrectChoiceLabel: (label: string) => void;
  setIllustration: (illustration: KangurQuestionIllustration) => void;
};

type KangurTestQuestionEditorStateContextValue = Pick<
  KangurTestQuestionEditorContextValue,
  'formData' | 'suiteTitle' | 'choices' | 'correctChoiceLabel'
>;

type KangurTestQuestionEditorActionsContextValue = Pick<
  KangurTestQuestionEditorContextValue,
  'onChange' | 'updateFormData' | 'setChoices' | 'setCorrectChoiceLabel' | 'setIllustration'
>;

const KangurTestQuestionEditorStateContext =
  createContext<KangurTestQuestionEditorStateContextValue | null>(null);
const KangurTestQuestionEditorActionsContext =
  createContext<KangurTestQuestionEditorActionsContextValue | null>(null);

type Props = {
  formData: QuestionFormData;
  onChange: (next: QuestionFormData) => void;
  suiteTitle?: string;
  children: ReactNode;
};

export function KangurTestQuestionEditorProvider({
  formData,
  onChange,
  suiteTitle,
  children,
}: Props): React.JSX.Element {
  const correctChoiceLabel = formData.correctChoiceLabel;

  const updateFormData = useCallback(
    (patch: Partial<QuestionFormData>): void => {
      onChange({ ...formData, ...patch });
    },
    [formData, onChange]
  );

  const setChoices = useCallback(
    (choices: KangurTestChoice[]): void => {
      updateFormData({ choices });
    },
    [updateFormData]
  );

  const setCorrectChoiceLabel = useCallback(
    (label: string): void => {
      updateFormData({ correctChoiceLabel: label });
    },
    [updateFormData]
  );

  const setIllustration = useCallback(
    (illustration: KangurQuestionIllustration): void => {
      updateFormData({ illustration });
    },
    [updateFormData]
  );

  const stateValue = useMemo<KangurTestQuestionEditorStateContextValue>(
    () => ({
      formData,
      suiteTitle,
      choices: formData.choices,
      correctChoiceLabel,
    }),
    [correctChoiceLabel, formData, suiteTitle]
  );
  const actionsValue = useMemo<KangurTestQuestionEditorActionsContextValue>(
    () => ({
      onChange,
      updateFormData,
      setChoices,
      setCorrectChoiceLabel,
      setIllustration,
    }),
    [onChange, setChoices, setCorrectChoiceLabel, setIllustration, updateFormData]
  );

  return (
    <KangurTestQuestionEditorActionsContext.Provider value={actionsValue}>
      <KangurTestQuestionEditorStateContext.Provider value={stateValue}>
        {children}
      </KangurTestQuestionEditorStateContext.Provider>
    </KangurTestQuestionEditorActionsContext.Provider>
  );
}

export function useKangurTestQuestionEditorState(): KangurTestQuestionEditorStateContextValue {
  const context = useContext(KangurTestQuestionEditorStateContext);
  if (!context) {
    throw internalError(
      'useKangurTestQuestionEditorState must be used within a KangurTestQuestionEditorProvider'
    );
  }
  return context;
}

export function useKangurTestQuestionEditorActions(): KangurTestQuestionEditorActionsContextValue {
  const context = useContext(KangurTestQuestionEditorActionsContext);
  if (!context) {
    throw internalError(
      'useKangurTestQuestionEditorActions must be used within a KangurTestQuestionEditorProvider'
    );
  }
  return context;
}

export function useKangurTestQuestionEditorContext(): KangurTestQuestionEditorContextValue {
  const state = useContext(KangurTestQuestionEditorStateContext);
  const actions = useContext(KangurTestQuestionEditorActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useKangurTestQuestionEditorContext must be used within a KangurTestQuestionEditorProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
}
