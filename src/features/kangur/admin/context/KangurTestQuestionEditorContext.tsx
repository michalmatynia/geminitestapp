'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { QuestionFormData } from '../../test-questions';
import type { KangurQuestionIllustration, KangurTestChoice } from '@/shared/contracts/kangur-tests';

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

const KangurTestQuestionEditorContext = createContext<KangurTestQuestionEditorContextValue | null>(
  null
);

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

  const value = useMemo(
    () => ({
      formData,
      onChange,
      suiteTitle,
      choices: formData.choices,
      correctChoiceLabel,
      updateFormData,
      setChoices,
      setCorrectChoiceLabel,
      setIllustration,
    }),
    [
      correctChoiceLabel,
      formData,
      onChange,
      setChoices,
      setCorrectChoiceLabel,
      setIllustration,
      suiteTitle,
      updateFormData,
    ]
  );

  return (
    <KangurTestQuestionEditorContext.Provider value={value}>
      {children}
    </KangurTestQuestionEditorContext.Provider>
  );
}

export function useKangurTestQuestionEditorContext(): KangurTestQuestionEditorContextValue {
  const context = useContext(KangurTestQuestionEditorContext);
  if (!context) {
    throw new Error(
      'useKangurTestQuestionEditorContext must be used within a KangurTestQuestionEditorProvider'
    );
  }
  return context;
}
