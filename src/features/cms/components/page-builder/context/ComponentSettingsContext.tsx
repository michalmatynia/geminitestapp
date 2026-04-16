'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';

import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { getEventEffectsConfig } from '@/features/cms/utils/event-effects';
import { DEFAULT_ANIMATION_CONFIG, type GsapAnimationConfig } from '@/features/gsap/public';
import {
  DEFAULT_CUSTOM_CSS_AI_CONFIG,
  type CustomCssAiConfig,
  type CssAnimationConfig,
} from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

import { getSectionDefinition, getBlockDefinition } from '../section-registry';

import type {
  ComponentSettingsActionsContextValue,
  ComponentSettingsStateContextValue,
  ConnectionSettings,
} from './ComponentSettingsContext.types';

export type {
  ComponentSettingsActionsContextValue,
  ComponentSettingsContextValue,
  ComponentSettingsStateContextValue,
  ConnectionSettings,
} from './ComponentSettingsContext.types';

const ComponentSettingsStateContext = createContext<ComponentSettingsStateContextValue | null>(
  null
);
const ComponentSettingsActionsContext = createContext<ComponentSettingsActionsContextValue | null>(
  null
);

export function useComponentSettingsState(): ComponentSettingsStateContextValue {
  const context = useContext(ComponentSettingsStateContext);
  if (!context) {
    throw internalError('useComponentSettingsState must be used within a ComponentSettingsProvider');
  }
  return context;
}

export function useComponentSettingsActions(): ComponentSettingsActionsContextValue {
  const context = useContext(ComponentSettingsActionsContext);
  if (!context) {
    throw internalError('useComponentSettingsActions must be used within a ComponentSettingsProvider');
  }
  return context;
}

export function ComponentSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentSection,
    selectedParentColumn,
    selectedParentRow,
    selectedParentBlock,
    dispatch,
  } = usePageBuilder();

  const [activeTab, setActiveTab] = React.useState<string>('settings');

  const sectionDef = useMemo(
    () => (selectedSection ? getSectionDefinition(selectedSection.type) : null),
    [selectedSection]
  );
  const blockDef = useMemo(
    () => (selectedBlock ? getBlockDefinition(selectedBlock.type) : null),
    [selectedBlock]
  );

  const selectedLabel = useMemo(() => {
    if (selectedSection) return sectionDef?.label ?? selectedSection.type;
    if (selectedColumn) return 'Column';
    if (selectedBlock) return blockDef?.label ?? selectedBlock.type;
    return '';
  }, [selectedSection, selectedColumn, selectedBlock, sectionDef, blockDef]);

  const selectedTitle = useMemo(() => {
    if (selectedSection) return `Section: ${selectedLabel}`;
    if (selectedBlock) return `Block: ${selectedLabel}`;
    if (selectedColumn) return 'Column';
    return 'Settings';
  }, [selectedSection, selectedBlock, selectedColumn, selectedLabel]);

  const hasSelection = Boolean(selectedSection || selectedBlock || selectedColumn);

  // --- Handlers ---
  const handleSectionSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedSection) return;
      dispatch({
        type: 'UPDATE_SECTION_SETTINGS',
        sectionId: selectedSection.id,
        settings: { [key]: value, ...(key === 'background' ? { backgroundColor: '' } : {}) },
      });
    },
    [selectedSection, dispatch]
  );

  const handleBlockSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedBlock || !selectedParentSection) return;
      const next = {
        [key]: value,
        ...(key === 'background' ? { backgroundColor: '' } : {}),
        ...(selectedBlock.type === 'Row' && key === 'heightMode' && value === 'inherit'
          ? { height: 0 }
          : {}),
      };

      if (selectedParentBlock && selectedParentColumn) {
        dispatch({
          type: 'UPDATE_NESTED_BLOCK_SETTINGS',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: next,
        });
      } else if (selectedParentBlock) {
        dispatch({
          type: 'UPDATE_NESTED_BLOCK_SETTINGS',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: next,
        });
      } else if (selectedParentColumn) {
        dispatch({
          type: 'UPDATE_NESTED_BLOCK_SETTINGS',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: next,
        });
      } else if (selectedParentRow) {
        dispatch({
          type: 'UPDATE_NESTED_BLOCK_SETTINGS',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: next,
        });
      } else {
        dispatch({
          type: 'UPDATE_BLOCK_SETTINGS',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: next,
        });
      }
    },
    [
      selectedBlock,
      selectedParentSection,
      selectedParentColumn,
      selectedParentRow,
      selectedParentBlock,
      dispatch,
    ]
  );

  const handleColumnSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedColumn || !selectedColumnParentSection) return;
      const next = {
        [key]: value,
        ...(key === 'background' ? { backgroundColor: '' } : {}),
        ...(key === 'heightMode' && value === 'inherit' ? { height: 0 } : {}),
      };
      dispatch({
        type: 'UPDATE_NESTED_BLOCK_SETTINGS',
        sectionId: selectedColumnParentSection.id,
        blockId: selectedColumn.id,
        settings: next,
      });
    },
    [selectedColumn, selectedColumnParentSection, dispatch]
  );

  // --- Animation State ---
  const currentAnimationConfig = useMemo(
    () =>
      (selectedSection?.settings['gsapAnimation'] ??
        selectedColumn?.settings['gsapAnimation'] ??
        selectedBlock?.settings['gsapAnimation'] ??
        DEFAULT_ANIMATION_CONFIG) as GsapAnimationConfig,
    [selectedSection, selectedColumn, selectedBlock]
  );
  const currentCssAnimationConfig = useMemo(
    () =>
      (selectedSection?.settings['cssAnimation'] ??
        selectedColumn?.settings['cssAnimation'] ??
        selectedBlock?.settings['cssAnimation']) as CssAnimationConfig | undefined,
    [selectedSection, selectedColumn, selectedBlock]
  );

  const handleAnimationChange = useCallback(
    (updates: Partial<GsapAnimationConfig>): void => {
      const config = { ...currentAnimationConfig, ...updates };
      if (selectedSection && !selectedBlock && !selectedColumn)
        handleSectionSettingChange('gsapAnimation', config);
      else if (selectedColumn) handleColumnSettingChange('gsapAnimation', config);
      else if (selectedBlock) handleBlockSettingChange('gsapAnimation', config);
    },
    [
      currentAnimationConfig,
      selectedSection,
      selectedBlock,
      selectedColumn,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  const handleCssAnimationChange = useCallback(
    (updates: Partial<CssAnimationConfig>): void => {
      const config = { ...(currentCssAnimationConfig ?? {}), ...updates };
      if (selectedSection && !selectedBlock && !selectedColumn)
        handleSectionSettingChange('cssAnimation', config);
      else if (selectedColumn) handleColumnSettingChange('cssAnimation', config);
      else if (selectedBlock) handleBlockSettingChange('cssAnimation', config);
    },
    [
      currentCssAnimationConfig,
      selectedSection,
      selectedBlock,
      selectedColumn,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  // --- Custom CSS ---
  const customCssValue = useMemo((): string => {
    if (selectedSection) return (selectedSection.settings['customCss'] as string) || '';
    if (selectedColumn) return (selectedColumn.settings['customCss'] as string) || '';
    if (selectedBlock) return (selectedBlock.settings['customCss'] as string) || '';
    return '';
  }, [selectedSection, selectedColumn, selectedBlock]);

  const customCssAiRaw = useMemo((): CustomCssAiConfig | undefined => {
    if (selectedSection)
      return selectedSection.settings['customCssAi'] as CustomCssAiConfig | undefined;
    if (selectedColumn)
      return selectedColumn.settings['customCssAi'] as CustomCssAiConfig | undefined;
    if (selectedBlock)
      return selectedBlock.settings['customCssAi'] as CustomCssAiConfig | undefined;
    return undefined;
  }, [selectedSection, selectedColumn, selectedBlock]);

  const customCssAiConfig = useMemo(
    (): CustomCssAiConfig => ({ ...DEFAULT_CUSTOM_CSS_AI_CONFIG, ...(customCssAiRaw ?? {}) }),
    [customCssAiRaw]
  );

  const handleCustomCssChange = useCallback(
    (value: string): void => {
      if (selectedSection) handleSectionSettingChange('customCss', value);
      else if (selectedColumn) handleColumnSettingChange('customCss', value);
      else if (selectedBlock) handleBlockSettingChange('customCss', value);
    },
    [
      selectedSection,
      selectedColumn,
      selectedBlock,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  const handleCustomCssAiChange = useCallback(
    (patch: Partial<CustomCssAiConfig>): void => {
      const next = { ...customCssAiConfig, ...patch };
      if (selectedSection) handleSectionSettingChange('customCssAi', next);
      else if (selectedColumn) handleColumnSettingChange('customCssAi', next);
      else if (selectedBlock) handleBlockSettingChange('customCssAi', next);
    },
    [
      customCssAiConfig,
      selectedSection,
      selectedColumn,
      selectedBlock,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  // --- AI Settings ---
  const handleApplyAiSettings = useCallback(
    (patch: Record<string, unknown>): void => {
      Object.entries(patch).forEach(([key, value]) => {
        if (selectedSection && !selectedBlock && !selectedColumn) {
          if (key === 'columns' && selectedSection.type === 'Grid')
            dispatch({
              type: 'SET_GRID_COLUMNS',
              sectionId: selectedSection.id,
              columnCount: value as number,
            });
          else if (key === 'rows' && selectedSection.type === 'Grid')
            dispatch({
              type: 'SET_GRID_ROWS',
              sectionId: selectedSection.id,
              rowCount: value as number,
            });
          else handleSectionSettingChange(key, value);
        } else if (selectedColumn) handleColumnSettingChange(key, value);
        else if (selectedBlock) handleBlockSettingChange(key, value);
      });
    },
    [
      selectedSection,
      selectedBlock,
      selectedColumn,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
      dispatch,
    ]
  );

  const contentAiAllowedKeys = useMemo((): string[] => {
    const schema = selectedSection
      ? sectionDef?.settingsSchema
      : selectedBlock
        ? blockDef?.settingsSchema
        : null;
    return schema ? schema.map((f: { key: string }) => f.key) : [];
  }, [selectedSection, selectedBlock, sectionDef, blockDef]);

  // --- Connection Settings ---
  const connectionSettings = useMemo((): ConnectionSettings => {
    const raw = ((selectedSection?.settings ??
      selectedColumn?.settings ??
      selectedBlock?.settings ??
      null)?.['connection'] ?? {}) as Partial<ConnectionSettings>;
    return {
      enabled: raw.enabled ?? false,
      source: raw.source ?? '',
      path: raw.path ?? '',
      fallback: raw.fallback ?? '',
    };
  }, [selectedSection, selectedColumn, selectedBlock]);

  const updateConnectionSetting = useCallback(
    (patch: Partial<ConnectionSettings>): void => {
      const next = { ...connectionSettings, ...patch };
      if (selectedSection && !selectedBlock && !selectedColumn) {
        handleSectionSettingChange('connection', next);
      } else if (selectedColumn) {
        handleColumnSettingChange('connection', next);
      } else if (selectedBlock) {
        handleBlockSettingChange('connection', next);
      }
    },
    [
      connectionSettings,
      selectedSection,
      selectedBlock,
      selectedColumn,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  // --- Event Effects ---
  const eventSettingsSource = useMemo(
    () => selectedBlock?.settings ?? selectedSection?.settings ?? null,
    [selectedBlock, selectedSection]
  );
  const eventConfig = useMemo(
    () => (eventSettingsSource ? getEventEffectsConfig(eventSettingsSource) : null),
    [eventSettingsSource]
  );

  const handleEventSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (selectedBlock) {
        handleBlockSettingChange(key, value);
      } else if (selectedSection) {
        handleSectionSettingChange(key, value);
      }
    },
    [selectedBlock, selectedSection, handleBlockSettingChange, handleSectionSettingChange]
  );

  const stateValue = useMemo(
    (): ComponentSettingsStateContextValue => ({
      hasSelection,
      selectedLabel,
      selectedTitle,
      activeTab,
      currentAnimationConfig,
      currentCssAnimationConfig,
      customCssValue,
      customCssAiConfig,
      contentAiAllowedKeys,
      connectionSettings,
      eventConfig,
    }),
    [
      hasSelection,
      selectedLabel,
      selectedTitle,
      activeTab,
      currentAnimationConfig,
      currentCssAnimationConfig,
      customCssValue,
      customCssAiConfig,
      contentAiAllowedKeys,
      connectionSettings,
      eventConfig,
    ]
  );
  const actionsValue = useMemo(
    (): ComponentSettingsActionsContextValue => ({
      setActiveTab,
      handleAnimationChange,
      handleCssAnimationChange,
      handleCustomCssChange,
      handleCustomCssAiChange,
      handleApplyAiSettings,
      updateConnectionSetting,
      handleEventSettingChange,
      handleBlockSettingChange,
      handleSectionSettingChange,
      handleColumnSettingChange,
    }),
    [
      setActiveTab,
      handleAnimationChange,
      handleCssAnimationChange,
      handleCustomCssChange,
      handleCustomCssAiChange,
      handleApplyAiSettings,
      updateConnectionSetting,
      handleEventSettingChange,
      handleBlockSettingChange,
      handleSectionSettingChange,
      handleColumnSettingChange,
    ]
  );

  return (
    <ComponentSettingsActionsContext.Provider value={actionsValue}>
      <ComponentSettingsStateContext.Provider value={stateValue}>
        {children}
      </ComponentSettingsStateContext.Provider>
    </ComponentSettingsActionsContext.Provider>
  );
}
