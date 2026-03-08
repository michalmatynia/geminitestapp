'use client';

import React, { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import type {
  KangurIllustrationPanel,
  KangurQuestionIllustration,
  KangurQuestionIllustrationLayout,
  KangurTestChoice,
} from '@/shared/contracts/kangur-tests';

import { createPanelIllustration } from '../../test-questions';
import { useKangurTestQuestionEditorContext } from './KangurTestQuestionEditorContext';
import { internalError } from '@/shared/errors/app-error';

const createPanelId = (): string => `panel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

type KangurQuestionIllustrationContextValue = {
  illustration: KangurQuestionIllustration;
  choices: KangurTestChoice[];
  setType: (type: string) => void;
  setPanelCount: (countStr: string) => void;
  setLayout: (layout: KangurQuestionIllustrationLayout) => void;
  setSingleSvgContent: (svgContent: string) => void;
  addPanel: () => void;
  removePanel: (panelId: string) => void;
  updatePanel: (
    panelId: string,
    updater: (panel: KangurIllustrationPanel) => KangurIllustrationPanel
  ) => void;
  syncLabelsToChoices: () => void;
};

const KangurQuestionIllustrationContext =
  createContext<KangurQuestionIllustrationContextValue | null>(null);

type KangurQuestionIllustrationProviderProps = {
  children: ReactNode;
};

export function KangurQuestionIllustrationProvider({
  children,
}: KangurQuestionIllustrationProviderProps): React.JSX.Element {
  const { choices, formData, setIllustration } = useKangurTestQuestionEditorContext();
  const { illustration } = formData;

  const setType = useCallback(
    (type: string): void => {
      if (type === 'none') {
        setIllustration({ type: 'none' });
        return;
      }

      if (type === 'single') {
        setIllustration({ type: 'single', svgContent: '' });
        return;
      }

      if (type === 'panels') {
        const labels = choices.map((choice) => choice.label);
        setIllustration(createPanelIllustration(Math.min(choices.length || 5, 5), labels));
      }
    },
    [choices, setIllustration]
  );

  const updatePanel = useCallback(
    (
      panelId: string,
      updater: (panel: KangurIllustrationPanel) => KangurIllustrationPanel
    ): void => {
      if (illustration.type !== 'panels') return;
      setIllustration({
        ...illustration,
        panels: illustration.panels.map((panel) => (panel.id === panelId ? updater(panel) : panel)),
      });
    },
    [illustration, setIllustration]
  );

  const addPanel = useCallback((): void => {
    if (illustration.type !== 'panels') return;
    const label = String.fromCharCode(65 + illustration.panels.length);
    setIllustration({
      ...illustration,
      panels: [
        ...illustration.panels,
        { id: createPanelId(), label, svgContent: '', description: '' },
      ],
    });
  }, [illustration, setIllustration]);

  const removePanel = useCallback(
    (panelId: string): void => {
      if (illustration.type !== 'panels' || illustration.panels.length <= 1) return;
      setIllustration({
        ...illustration,
        panels: illustration.panels.filter((panel) => panel.id !== panelId),
      });
    },
    [illustration, setIllustration]
  );

  const syncLabelsToChoices = useCallback((): void => {
    if (illustration.type !== 'panels') return;
    setIllustration({
      ...illustration,
      panels: illustration.panels.map((panel, index) => ({
        ...panel,
        label: choices[index]?.label ?? panel.label,
      })),
    });
  }, [choices, illustration, setIllustration]);

  const setPanelCount = useCallback(
    (countStr: string): void => {
      if (illustration.type !== 'panels') return;
      const count = Number.parseInt(countStr, 10);
      if (!Number.isFinite(count)) return;

      const labels = choices.map((choice) => choice.label);
      const currentPanels = illustration.panels;
      const nextPanels =
        count > currentPanels.length
          ? [
            ...currentPanels,
            ...Array.from({ length: count - currentPanels.length }, (_, index) => ({
              id: createPanelId(),
              label:
                  labels[currentPanels.length + index] ??
                  String.fromCharCode(65 + currentPanels.length + index),
              svgContent: '',
              description: '',
            })),
          ]
          : currentPanels.slice(0, count);

      setIllustration({ ...illustration, panels: nextPanels });
    },
    [choices, illustration, setIllustration]
  );

  const setLayout = useCallback(
    (layout: KangurQuestionIllustrationLayout): void => {
      if (illustration.type !== 'panels') return;
      setIllustration({ ...illustration, layout });
    },
    [illustration, setIllustration]
  );

  const setSingleSvgContent = useCallback(
    (svgContent: string): void => {
      if (illustration.type !== 'single') return;
      setIllustration({ ...illustration, svgContent });
    },
    [illustration, setIllustration]
  );

  const value = useMemo<KangurQuestionIllustrationContextValue>(
    () => ({
      illustration,
      choices,
      setType,
      setPanelCount,
      setLayout,
      setSingleSvgContent,
      addPanel,
      removePanel,
      updatePanel,
      syncLabelsToChoices,
    }),
    [
      addPanel,
      choices,
      illustration,
      removePanel,
      setLayout,
      setPanelCount,
      setSingleSvgContent,
      setType,
      syncLabelsToChoices,
      updatePanel,
    ]
  );

  return (
    <KangurQuestionIllustrationContext.Provider value={value}>
      {children}
    </KangurQuestionIllustrationContext.Provider>
  );
}

export function useKangurQuestionIllustrationContext(): KangurQuestionIllustrationContextValue {
  const context = useContext(KangurQuestionIllustrationContext);
  if (!context) {
    throw internalError(
      'useKangurQuestionIllustrationContext must be used within a KangurQuestionIllustrationProvider'
    );
  }
  return context;
}

type KangurIllustrationPanelContextValue = {
  panel: KangurIllustrationPanel;
  canDelete: boolean;
  setSvgContent: (svgContent: string) => void;
  setLabel: (label: string) => void;
  setDescription: (description: string) => void;
  remove: () => void;
};

const KangurIllustrationPanelContext = createContext<KangurIllustrationPanelContextValue | null>(
  null
);

type KangurIllustrationPanelProviderProps = {
  panel: KangurIllustrationPanel;
  canDelete: boolean;
  children: ReactNode;
};

export function KangurIllustrationPanelProvider({
  panel,
  canDelete,
  children,
}: KangurIllustrationPanelProviderProps): React.JSX.Element {
  const { removePanel, updatePanel } = useKangurQuestionIllustrationContext();

  const setSvgContent = useCallback(
    (svgContent: string): void => {
      updatePanel(panel.id, (currentPanel) => ({ ...currentPanel, svgContent }));
    },
    [panel.id, updatePanel]
  );

  const setLabel = useCallback(
    (label: string): void => {
      updatePanel(panel.id, (currentPanel) => ({ ...currentPanel, label }));
    },
    [panel.id, updatePanel]
  );

  const setDescription = useCallback(
    (description: string): void => {
      updatePanel(panel.id, (currentPanel) => ({ ...currentPanel, description }));
    },
    [panel.id, updatePanel]
  );

  const remove = useCallback((): void => {
    removePanel(panel.id);
  }, [panel.id, removePanel]);

  const value = useMemo<KangurIllustrationPanelContextValue>(
    () => ({
      panel,
      canDelete,
      setSvgContent,
      setLabel,
      setDescription,
      remove,
    }),
    [canDelete, panel, remove, setDescription, setLabel, setSvgContent]
  );

  return (
    <KangurIllustrationPanelContext.Provider value={value}>
      {children}
    </KangurIllustrationPanelContext.Provider>
  );
}

export function useKangurIllustrationPanelContext(): KangurIllustrationPanelContextValue {
  const context = useContext(KangurIllustrationPanelContext);
  if (!context) {
    throw internalError(
      'useKangurIllustrationPanelContext must be used within a KangurIllustrationPanelProvider'
    );
  }
  return context;
}
