'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import type { KangurQuestionIllustration, KangurTestChoice } from '@/features/kangur/shared/contracts/kangur-tests';
import { internalError } from '@/features/kangur/shared/errors/app-error';

import type { QuestionFormData } from '../../test-suites/questions';

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

export const KangurTestQuestionEditorStateContext =
  createContext<KangurTestQuestionEditorStateContextValue | null>(null);
export const KangurTestQuestionEditorActionsContext =
  createContext<KangurTestQuestionEditorActionsContextValue | null>(null);

type Props = {
  formData: QuestionFormData;
  onChange: (next: QuestionFormData) => void;
  suiteTitle?: string;
  children: ReactNode;
};

export function useCreateKangurTestQuestionEditorProviderValues({
  formData,
  onChange,
  suiteTitle,
}: Omit<Props, 'children'>): {
  actionsValue: KangurTestQuestionEditorActionsContextValue;
  stateValue: KangurTestQuestionEditorStateContextValue;
} {
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

  return { stateValue, actionsValue };
}

export function KangurTestQuestionEditorProvider({
  formData,
  onChange,
  suiteTitle,
  children,
}: Props): React.JSX.Element {
  const { stateValue, actionsValue } = useCreateKangurTestQuestionEditorProviderValues({
    formData,
    onChange,
    suiteTitle,
  });

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
