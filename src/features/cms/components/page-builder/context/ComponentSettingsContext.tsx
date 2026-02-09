'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { getSectionDefinition, getBlockDefinition } from '../section-registry';
import { getEventEffectsConfig } from '@/features/cms/utils/event-effects';


interface ConnectionSettings {
  enabled: boolean;
  source: string;
  path: string;
  fallback: string;
}

interface ComponentSettingsContextValue {
  hasSelection: boolean;
  selectedLabel: string;
  selectedTitle: string;
  connectionSettings: ConnectionSettings;
  updateConnectionSetting: (patch: Partial<ConnectionSettings>) => void;
  eventConfig: ReturnType<typeof getEventEffectsConfig> | null;
  handleEventSettingChange: (key: string, value: unknown) => void;
  handleBlockSettingChange: (key: string, value: unknown) => void;
  handleSectionSettingChange: (key: string, value: unknown) => void;
  handleColumnSettingChange: (key: string, value: unknown) => void;
}

const ComponentSettingsContext = createContext<ComponentSettingsContextValue | null>(null);

export function useComponentSettings(): ComponentSettingsContextValue {
  const context = useContext(ComponentSettingsContext);
  if (!context) {
    throw new Error('useComponentSettings must be used within a ComponentSettingsProvider');
  }
  return context;
}

export function ComponentSettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
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

  const sectionDef = useMemo(() => selectedSection ? getSectionDefinition(selectedSection.type) : null, [selectedSection]);
  const blockDef = useMemo(() => selectedBlock ? getBlockDefinition(selectedBlock.type) : null, [selectedBlock]);

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

  const hasSelection = !!(selectedSection || selectedBlock || selectedColumn);

  // --- Connection Settings ---
  const connectionSettings = useMemo((): ConnectionSettings => {
    const raw = ((selectedSection?.settings ?? selectedColumn?.settings ?? selectedBlock?.settings ?? null)?.['connection'] ?? {}) as Partial<ConnectionSettings>;
    return {
      enabled: raw.enabled ?? false,
      source: raw.source ?? '',
      path: raw.path ?? '',
      fallback: raw.fallback ?? '',
    };
  }, [selectedSection, selectedColumn, selectedBlock]);

  // --- Handlers ---
  const handleSectionSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedSection) return;
    dispatch({ 
      type: 'UPDATE_SECTION_SETTINGS', 
      sectionId: selectedSection.id, 
      settings: { [key]: value, ...(key === 'background' ? { backgroundColor: '' } : {}) } 
    });
  }, [selectedSection, dispatch]);

  const handleBlockSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedBlock || !selectedParentSection) return;
    const next = { 
      [key]: value, 
      ...(key === 'background' ? { backgroundColor: '' } : {}),
      ...(selectedBlock.type === 'Row' && key === 'heightMode' && value === 'inherit' ? { height: 0 } : {}) 
    };
    
    if (selectedParentBlock && selectedParentColumn) {
      dispatch({ type: 'UPDATE_NESTED_BLOCK_SETTINGS', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, parentBlockId: selectedParentBlock.id, blockId: selectedBlock.id, settings: next });
    } else if (selectedParentBlock) {
      dispatch({ type: 'UPDATE_SECTION_BLOCK_SETTINGS', sectionId: selectedParentSection.id, parentBlockId: selectedParentBlock.id, blockId: selectedBlock.id, settings: next });
    } else if (selectedParentColumn) {
      dispatch({ type: 'UPDATE_BLOCK_IN_COLUMN', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, blockId: selectedBlock.id, settings: next });
    } else if (selectedParentRow) {
      dispatch({ type: 'UPDATE_SECTION_BLOCK_SETTINGS', sectionId: selectedParentSection.id, parentBlockId: selectedParentRow.id, blockId: selectedBlock.id, settings: next });
    } else {
      dispatch({ type: 'UPDATE_BLOCK_SETTINGS', sectionId: selectedParentSection.id, blockId: selectedBlock.id, settings: next });
    }
  }, [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock, dispatch]);

  const handleColumnSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedColumn || !selectedColumnParentSection) return;
    const next = { 
      [key]: value, 
      ...(key === 'background' ? { backgroundColor: '' } : {}),
      ...(key === 'heightMode' && value === 'inherit' ? { height: 0 } : {}) 
    };
    dispatch({ type: 'UPDATE_COLUMN_SETTINGS', sectionId: selectedColumnParentSection.id, columnId: selectedColumn.id, settings: next });
  }, [selectedColumn, selectedColumnParentSection, dispatch]);

  const updateConnectionSetting = useCallback((patch: Partial<ConnectionSettings>): void => {
    const next = { ...connectionSettings, ...patch };
    if (selectedSection && !selectedBlock && !selectedColumn) {
      handleSectionSettingChange('connection', next);
    } else if (selectedColumn) {
      handleColumnSettingChange('connection', next);
    } else if (selectedBlock) {
      handleBlockSettingChange('connection', next);
    }
  }, [connectionSettings, selectedSection, selectedBlock, selectedColumn, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]);

  // --- Event Effects ---
  const eventSettingsSource = useMemo(() => selectedBlock?.settings ?? selectedSection?.settings ?? null, [selectedBlock, selectedSection]);
  const eventConfig = useMemo(() => (eventSettingsSource ? getEventEffectsConfig(eventSettingsSource) : null), [eventSettingsSource]);

  const handleEventSettingChange = useCallback((key: string, value: unknown): void => {
    if (selectedBlock) {
      handleBlockSettingChange(key, value);
    } else if (selectedSection) {
      handleSectionSettingChange(key, value);
    }
  }, [selectedBlock, selectedSection, handleBlockSettingChange, handleSectionSettingChange]);

  const value = useMemo(() => ({
    hasSelection,
    selectedLabel,
    selectedTitle,
    connectionSettings,
    updateConnectionSetting,
    eventConfig,
    handleEventSettingChange,
    handleBlockSettingChange,
    handleSectionSettingChange,
    handleColumnSettingChange,
  }), [
    hasSelection,
    selectedLabel,
    selectedTitle,
    connectionSettings,
    updateConnectionSetting,
    eventConfig,
    handleEventSettingChange,
    handleBlockSettingChange,
    handleSectionSettingChange,
    handleColumnSettingChange,
  ]);

  return (
    <ComponentSettingsContext.Provider value={value}>
      {children}
    </ComponentSettingsContext.Provider>
  );
}
