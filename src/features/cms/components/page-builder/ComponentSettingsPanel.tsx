'use client';

import { Trash2, MousePointer2, Monitor, Smartphone, PanelRightClose, Paintbrush } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { APP_EMBED_SETTING_KEY, type AppEmbedId, APP_EMBED_OPTIONS } from '@/features/app-embeds/lib/constants';
import type { CssAnimationConfig } from '@/features/cms/types/css-animations';
import type { CustomCssAiConfig } from '@/features/cms/types/custom-css-ai';
import { DEFAULT_CUSTOM_CSS_AI_CONFIG } from '@/features/cms/types/custom-css-ai';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import type { GsapAnimationConfig } from '@/features/gsap';
import { logClientError } from '@/features/observability';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SectionHeader, Tabs, TabsList, TabsTrigger, TabsContent, Input, Textarea, useToast, SidePanel, SelectSimple, ToggleRow, Tooltip } from '@/shared/ui';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { AnimationConfigPanel } from './AnimationConfigPanel';
import { InspectorAiProvider } from './context/InspectorAiContext';
import { CssAnimationConfigPanel } from './CssAnimationConfigPanel';
import { GRID_TEMPLATE_SETTINGS_KEY, normalizeGridTemplates } from './grid-templates';
import { getSectionDefinition, getBlockDefinition, IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS, getImageBackgroundTargetOptions, type ImageBackgroundTarget } from './section-registry';
import { SECTION_TEMPLATE_SETTINGS_KEY, normalizeSectionTemplates, type SectionTemplateRecord } from './section-template-store';
import { ConnectionsTab } from './settings/ConnectionsTab';
import { ContentAiSection } from './settings/ContentAiSection';
import { CssAiSection } from './settings/CssAiSection';
import { EventEffectsTab } from './settings/EventEffectsTab';
import { prependManagementFields, groupSettingsFields, renderFieldGroups } from './settings/field-group-helpers';
import { PageSettingsTab } from './settings/PageSettingsTab';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';

import type { SettingsField, InspectorSettings, BlockInstance } from '../../types/page-builder';



type TabValue = 'settings' | 'animation' | 'cssAnimation' | 'events' | 'connections' | 'customCss' | 'ai';

export function ComponentSettingsPanel(): React.ReactNode {
  const {
    state,
    selectedSection,
    selectedBlock,
    selectedParentSection,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentColumn,
    selectedParentRow,
    selectedParentBlock,
    dispatch,
  } = usePageBuilder();
  
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const [sectionTemplateName, setSectionTemplateName] = useState<string>('');
  const [sectionTemplateCategory, setSectionTemplateCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'settings' | 'animation' | 'cssAnimation' | 'events' | 'connections' | 'customCss' | 'ai'>('settings');

  const isRowBlock = selectedBlock?.type === 'Row' && selectedParentSection?.type === 'Grid';
  const isGridSection = selectedSection?.type === 'Grid';
  const isBlockSection = selectedSection?.type === 'Block';
  const showCustomCssTab = Boolean(isGridSection || isBlockSection || selectedColumn || selectedBlock);

  const customCssValue = useMemo((): string => {
    if (selectedSection && (isGridSection || isBlockSection)) return (selectedSection.settings['customCss'] as string) || '';
    if (selectedColumn) return (selectedColumn.settings['customCss'] as string) || '';
    if (selectedBlock) return (selectedBlock.settings['customCss'] as string) || '';
    return '';
  }, [selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection]);

  const customCssAiRaw = useMemo((): CustomCssAiConfig | undefined => {
    if (selectedSection && (isGridSection || isBlockSection)) return selectedSection.settings['customCssAi'] as CustomCssAiConfig | undefined;
    if (selectedColumn) return selectedColumn.settings['customCssAi'] as CustomCssAiConfig | undefined;
    if (selectedBlock) return selectedBlock.settings['customCssAi'] as CustomCssAiConfig | undefined;
    return undefined;
  }, [selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection]);

  const customCssAiConfig = useMemo(
    (): CustomCssAiConfig => ({ ...DEFAULT_CUSTOM_CSS_AI_CONFIG, ...(customCssAiRaw ?? {}) }),
    [customCssAiRaw]
  );

  const selectedGridRow = useMemo<BlockInstance | null>(() => {
    if (selectedParentSection?.type !== 'Grid' || !selectedParentColumn) return null;
    return selectedParentSection.blocks.find((b: BlockInstance) => b.type === 'Row' && (b.blocks ?? []).some((c: BlockInstance) => c.id === selectedParentColumn.id)) ?? null;
  }, [selectedParentSection, selectedParentColumn]);

  const rowHeightMode = (selectedBlock?.settings?.['heightMode'] as string) || 'inherit';
  const rowSettingsForRender = useMemo(() => (!isRowBlock || !selectedBlock) ? null : (rowHeightMode !== 'inherit' ? selectedBlock.settings : { ...selectedBlock.settings, height: 0 }), [isRowBlock, selectedBlock, rowHeightMode]);
  const columnHeightMode = (selectedColumn?.settings?.['heightMode'] as string) || 'inherit';
  const columnSettingsForRender = useMemo(() => !selectedColumn ? null : (columnHeightMode !== 'inherit' ? selectedColumn.settings : { ...selectedColumn.settings, height: 0 }), [selectedColumn, columnHeightMode]);

  const isGridImageElement = selectedBlock?.type === 'ImageElement' && selectedParentSection?.type === 'Grid' && !selectedParentBlock;
  const imageBackgroundSrc = (selectedBlock?.settings?.['src'] as string) || '';
  const isImageElementInContainer = selectedBlock?.type === 'ImageElement' && selectedParentSection?.type === 'Grid' && !selectedParentBlock;
  const currentBackgroundTarget = (selectedBlock?.settings?.['backgroundTarget'] as ImageBackgroundTarget) || 'none';
  const isInBackgroundMode = currentBackgroundTarget !== 'none';

  const backgroundTargetOptions = useMemo(() => {
    if (!isImageElementInContainer) return [];
    return getImageBackgroundTargetOptions(selectedParentSection?.type === 'Grid', Boolean(selectedGridRow), Boolean(selectedParentColumn));
  }, [isImageElementInContainer, selectedParentSection, selectedGridRow, selectedParentColumn]);

  const handleSectionSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedSection) return;
    dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: selectedSection.id, settings: { [key]: value, ...(key === 'background' ? { backgroundColor: '' } : {}) } });
  }, [selectedSection, dispatch]);

  const handleBlockSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedBlock || !selectedParentSection) return;
    const next = { [key]: value, ...(key === 'background' ? { backgroundColor: '' } : {}), ...(selectedBlock.type === 'Row' && key === 'heightMode' && value === 'inherit' ? { height: 0 } : {}) };
    if (selectedParentBlock && selectedParentColumn) dispatch({ type: 'UPDATE_NESTED_BLOCK_SETTINGS', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, parentBlockId: selectedParentBlock.id, blockId: selectedBlock.id, settings: next });
    else if (selectedParentBlock) dispatch({ type: 'UPDATE_SECTION_BLOCK_SETTINGS', sectionId: selectedParentSection.id, parentBlockId: selectedParentBlock.id, blockId: selectedBlock.id, settings: next });
    else if (selectedParentColumn) dispatch({ type: 'UPDATE_BLOCK_IN_COLUMN', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, blockId: selectedBlock.id, settings: next });
    else if (selectedParentRow) dispatch({ type: 'UPDATE_SECTION_BLOCK_SETTINGS', sectionId: selectedParentSection.id, parentBlockId: selectedParentRow.id, blockId: selectedBlock.id, settings: next });
    else dispatch({ type: 'UPDATE_BLOCK_SETTINGS', sectionId: selectedParentSection.id, blockId: selectedBlock.id, settings: next });
  }, [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock, dispatch]);

  const handleColumnSettingChange = useCallback((key: string, value: unknown): void => {
    if (!selectedColumn || !selectedColumnParentSection) return;
    const next = { [key]: value, ...(key === 'background' ? { backgroundColor: '' } : {}), ...(key === 'heightMode' && value === 'inherit' ? { height: 0 } : {}) };
    dispatch({ type: 'UPDATE_COLUMN_SETTINGS', sectionId: selectedColumnParentSection.id, columnId: selectedColumn.id, settings: next });
  }, [selectedColumn, selectedColumnParentSection, dispatch]);

  const handleSectionSettingChangeWithGridColumns = useCallback((key: string, value: unknown): void => {
    if (!selectedSection) return;
    if (key === 'columns' && selectedSection.type === 'Grid') dispatch({ type: 'SET_GRID_COLUMNS', sectionId: selectedSection.id, columnCount: value as number });
    else if (key === 'rows' && selectedSection.type === 'Grid') dispatch({ type: 'SET_GRID_ROWS', sectionId: selectedSection.id, rowCount: value as number });
    else handleSectionSettingChange(key, value);
  }, [selectedSection, dispatch, handleSectionSettingChange]);

  const handleCustomCssChange = useCallback((value: string): void => {
    if (selectedSection && (isGridSection || isBlockSection)) handleSectionSettingChange('customCss', value);
    else if (selectedColumn) handleColumnSettingChange('customCss', value);
    else if (selectedBlock) handleBlockSettingChange('customCss', value);
  }, [selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]);

  const handleCustomCssAiChange = useCallback((patch: Partial<CustomCssAiConfig>): void => {
    const next = { ...customCssAiConfig, ...patch };
    if (selectedSection && (isGridSection || isBlockSection)) handleSectionSettingChange('customCssAi', next);
    else if (selectedColumn) handleColumnSettingChange('customCssAi', next);
    else if (selectedBlock) handleBlockSettingChange('customCssAi', next);
  }, [customCssAiConfig, selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]);

  const handleApplyAiSettings = useCallback((patch: Record<string, unknown>): void => {
    Object.entries(patch).forEach(([key, value]) => {
      if (selectedSection && !selectedBlock && !selectedColumn) handleSectionSettingChangeWithGridColumns(key, value);
      else if (selectedColumn) handleColumnSettingChange(key, value);
      else if (selectedBlock) handleBlockSettingChange(key, value);
    });
  }, [selectedSection, selectedBlock, selectedColumn, handleSectionSettingChangeWithGridColumns, handleColumnSettingChange, handleBlockSettingChange]);

  const handleRemoveSection = useCallback(() => selectedSection && dispatch({ type: 'REMOVE_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);
  const handleCopySection = useCallback(() => selectedSection && dispatch({ type: 'COPY_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);
  const handleDuplicateSection = useCallback(() => selectedSection && dispatch({ type: 'DUPLICATE_SECTION', sectionId: selectedSection.id }), [selectedSection, dispatch]);

  const handleRemoveBlock = useCallback((): void => {
    if (!selectedBlock || !selectedParentSection) return;
    if (selectedParentBlock && selectedParentColumn) dispatch({ type: 'REMOVE_ELEMENT_FROM_NESTED_BLOCK', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, parentBlockId: selectedParentBlock.id, elementId: selectedBlock.id });
    else if (selectedParentBlock) dispatch({ type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK', sectionId: selectedParentSection.id, parentBlockId: selectedParentBlock.id, elementId: selectedBlock.id });
    else if (selectedParentColumn) dispatch({ type: 'REMOVE_BLOCK_FROM_COLUMN', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, blockId: selectedBlock.id });
    else if (selectedParentRow) dispatch({ type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK', sectionId: selectedParentSection.id, parentBlockId: selectedParentRow.id, elementId: selectedBlock.id });
    else dispatch({ type: 'REMOVE_BLOCK', sectionId: selectedParentSection.id, blockId: selectedBlock.id });
  }, [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock, dispatch]);

  const handleMakeBackground = useCallback((target: 'grid' | 'row' | 'column'): void => {
    if (selectedBlock?.type !== 'ImageElement' || selectedParentSection?.type !== 'Grid' || !imageBackgroundSrc || selectedParentBlock) return;
    const backgroundImage = { ...selectedBlock.settings };
    if (target === 'grid') dispatch({ type: 'UPDATE_SECTION_SETTINGS', sectionId: selectedParentSection.id, settings: { backgroundImage } });
    else if (target === 'row') { if (selectedGridRow) dispatch({ type: 'UPDATE_BLOCK_SETTINGS', sectionId: selectedParentSection.id, blockId: selectedGridRow.id, settings: { backgroundImage } }); }
    else { if (selectedParentColumn) dispatch({ type: 'UPDATE_COLUMN_SETTINGS', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, settings: { backgroundImage } }); }
    if (selectedParentColumn) dispatch({ type: 'REMOVE_BLOCK_FROM_COLUMN', sectionId: selectedParentSection.id, columnId: selectedParentColumn.id, blockId: selectedBlock.id });
    else dispatch({ type: 'REMOVE_BLOCK', sectionId: selectedParentSection.id, blockId: selectedBlock.id });
  }, [dispatch, imageBackgroundSrc, selectedBlock, selectedGridRow, selectedParentBlock, selectedParentColumn, selectedParentSection]);

  const handleRemoveRow = useCallback(() => isRowBlock && selectedParentSection && selectedBlock && dispatch({ type: 'REMOVE_GRID_ROW', sectionId: selectedParentSection.id, rowId: selectedBlock.id }), [isRowBlock, selectedParentSection, selectedBlock, dispatch]);



  const handleAnimationChange = useCallback((config: GsapAnimationConfig): void => {
    if (selectedSection && !selectedBlock && !selectedColumn) handleSectionSettingChange('gsapAnimation', config);
    else if (selectedColumn) handleColumnSettingChange('gsapAnimation', config);
    else if (selectedBlock) handleBlockSettingChange('gsapAnimation', config);
  }, [selectedSection, selectedBlock, selectedColumn, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]);

  const handleCssAnimationChange = useCallback((config: CssAnimationConfig): void => {
    if (selectedSection && !selectedBlock && !selectedColumn) handleSectionSettingChange('cssAnimation', config);
    else if (selectedColumn) handleColumnSettingChange('cssAnimation', config);
    else if (selectedBlock) handleBlockSettingChange('cssAnimation', config);
  }, [selectedSection, selectedBlock, selectedColumn, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]);

  const handleSaveSectionTemplate = useCallback(async (): Promise<void> => {
    if (!selectedSection) return;
    const sectionTemplates = normalizeSectionTemplates(parseJsonSetting(settingsStore.get(SECTION_TEMPLATE_SETTINGS_KEY), []));
    const gridTemplates = normalizeGridTemplates(parseJsonSetting(settingsStore.get(GRID_TEMPLATE_SETTINGS_KEY), []));
    const name = sectionTemplateName.trim() || `${selectedSection.type} template ${sectionTemplates.length + 1}`;
    const category = sectionTemplateCategory.trim() || 'Saved sections';
    const sectionClone = structuredClone({ ...selectedSection, zone: 'template' as const });
    const nextRecord: SectionTemplateRecord = { id: `section-${Date.now()}`, name, description: '', category, sectionType: selectedSection.type, createdAt: new Date().toISOString(), section: sectionClone };
    try {
      const promises = [updateSetting.mutateAsync({ key: SECTION_TEMPLATE_SETTINGS_KEY, value: serializeSetting([...sectionTemplates, nextRecord]) })];
      if (selectedSection.type === 'Grid') promises.push(updateSetting.mutateAsync({ key: GRID_TEMPLATE_SETTINGS_KEY, value: serializeSetting([...gridTemplates, { id: `grid-${Date.now()}`, name, description: '', createdAt: new Date().toISOString(), section: sectionClone }]) }));
      await Promise.all(promises);
      setSectionTemplateName(''); setSectionTemplateCategory('');
      toast('Section saved as template.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'ComponentSettingsPanel', action: 'saveSectionTemplate' } });
      toast('Failed to save section template.', { variant: 'error' });
    }
  }, [selectedSection, sectionTemplateName, sectionTemplateCategory, settingsStore, updateSetting, toast]);

  const sectionDef = selectedSection ? getSectionDefinition(selectedSection.type) : null;
  const blockDef = selectedBlock ? getBlockDefinition(selectedBlock.type) : null;
  const columnDef = selectedColumn ? getBlockDefinition('Column') : null;
  const inspectorSettings = state.inspectorSettings;
  const hasSelection = !!(selectedSection || selectedBlock || selectedColumn);
  const showConnectionsTab = state.inspectorEnabled;
  const showEventsTab = Boolean(selectedBlock || selectedSection);


  const appEmbedOptions = useMemo((): { label: string; value: string }[] => {
    const enabled = parseJsonSetting<AppEmbedId[]>(settingsStore.get(APP_EMBED_SETTING_KEY), []);
    const options = APP_EMBED_OPTIONS.filter((o) => enabled.includes(o.id)).map((o) => ({ label: o.label, value: o.id }));
    return options.length > 0 ? options : [{ label: 'No app embeds enabled', value: '' }];
  }, [settingsStore]);





  const updateInspectorSetting = useCallback((patch: Partial<InspectorSettings>): void => dispatch({ type: 'UPDATE_INSPECTOR_SETTINGS', settings: patch }), [dispatch]);
  const handleToggleInspector = useCallback((): void => {
    const next = !state.inspectorEnabled; dispatch({ type: 'TOGGLE_INSPECTOR' });
    if (next) setActiveTab('connections'); else if (activeTab === 'connections') setActiveTab('settings');
  }, [activeTab, dispatch, state.inspectorEnabled]);

  const currentAnimationConfig = useMemo(() => (selectedSection?.settings['gsapAnimation'] ?? selectedColumn?.settings['gsapAnimation'] ?? selectedBlock?.settings['gsapAnimation']) as GsapAnimationConfig | undefined, [selectedSection, selectedColumn, selectedBlock]);
  const currentCssAnimationConfig = useMemo(() => (selectedSection?.settings['cssAnimation'] ?? selectedColumn?.settings['cssAnimation'] ?? selectedBlock?.settings['cssAnimation']) as CssAnimationConfig | undefined, [selectedSection, selectedColumn, selectedBlock]);

  const selectedLabel = useMemo(() => selectedSection ? (sectionDef?.label ?? selectedSection.type) : (selectedColumn ? 'Column' : (selectedBlock ? (blockDef?.label ?? selectedBlock.type) : '')), [selectedSection, selectedColumn, selectedBlock, sectionDef, blockDef]);
  const selectedTitle = useMemo(() => selectedSection ? `Section: ${selectedLabel}` : (selectedBlock ? `Block: ${selectedLabel}` : (selectedColumn ? 'Column' : 'Settings')), [selectedSection, selectedBlock, selectedColumn, selectedLabel]);
  const headerTooltips = useMemo(
    () => ({
      hideRightPanel: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.cms,
        'component_settings_hide_right_panel'
      ) ?? 'Hide right panel',
      toggleInspector: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.cms,
        'component_settings_toggle_inspector'
      ) ?? 'Toggle inspector',
      desktopPreview: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.cms,
        'component_settings_desktop_preview'
      ) ?? 'Desktop preview',
      mobilePreview: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.cms,
        'component_settings_mobile_preview'
      ) ?? 'Mobile preview',
      toggleEditorChrome: getDocumentationTooltip(
        DOCUMENTATION_MODULE_IDS.cms,
        'component_settings_toggle_editor_chrome'
      ) ?? 'Toggle editor chrome',
    }),
    []
  );

  const contentAiAllowedKeys = useMemo((): string[] => {
    const schema = selectedSection ? sectionDef?.settingsSchema : (selectedColumn ? columnDef?.settingsSchema : (selectedBlock ? blockDef?.settingsSchema : null));
    return schema ? prependManagementFields(schema).map((f: SettingsField) => f.key) : [];
  }, [selectedSection, selectedColumn, selectedBlock, sectionDef, columnDef, blockDef]);

  useEffect((): void => {
    if (!showEventsTab && activeTab === 'events') setActiveTab('settings');
    if (!showCustomCssTab && activeTab === 'customCss') setActiveTab('settings');
  }, [showEventsTab, showCustomCssTab, activeTab]);

  return (
    <InspectorAiProvider
      customCssValue={customCssValue}
      customCssAiConfig={customCssAiConfig}
      onUpdateCss={handleCustomCssChange}
      onUpdateSettings={handleApplyAiSettings}
      onUpdateCustomCssAiConfig={handleCustomCssAiChange}
      contentAiAllowedKeys={contentAiAllowedKeys}
      aiQueriesEnabled={activeTab === 'ai' || activeTab === 'customCss'}
    >
      <SidePanel
        position='right'
        width={320}
        isFocusMode={!state.currentPage}
        header={(
          <SectionHeader
            title={selectedTitle} 
            size='xs'
            className='p-3 flex-row-reverse' 
            titleClassName='text-right' 
            actionsClassName='justify-start'
            actions={(
              <div className='flex items-center gap-1'>
                <Tooltip content={headerTooltips.hideRightPanel}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
                    className='h-6 w-6 p-0 text-gray-500 hover:text-gray-300'
                    aria-label='Hide right panel'
                  >
                    <PanelRightClose className='size-3.5' />
                  </Button>
                </Tooltip>
                <Tooltip content={headerTooltips.toggleInspector}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={handleToggleInspector}
                    className={`h-6 w-6 p-0 ${state.inspectorEnabled ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                    aria-label='Toggle inspector'
                  >
                    <MousePointer2 className='size-3.5' />
                  </Button>
                </Tooltip>
                <Tooltip content={headerTooltips.desktopPreview}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'desktop' })}
                    className={`h-6 w-6 p-0 ${state.previewMode === 'desktop' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                    aria-label='Desktop preview'
                  >
                    <Monitor className='size-3.5' />
                  </Button>
                </Tooltip>
                <Tooltip content={headerTooltips.mobilePreview}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'mobile' })}
                    className={`h-6 w-6 p-0 ${state.previewMode === 'mobile' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                    aria-label='Mobile preview'
                  >
                    <Smartphone className='size-3.5' />
                  </Button>
                </Tooltip>
                <Tooltip content={headerTooltips.toggleEditorChrome}>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    onClick={() => updateInspectorSetting({ showEditorChrome: !inspectorSettings.showEditorChrome })}
                    className={`h-6 w-6 p-0 ${inspectorSettings.showEditorChrome ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                    aria-label='Toggle editor chrome'
                  >
                    <Paintbrush className='size-3.5' />
                  </Button>
                </Tooltip>
              </div>
            )}
          />
        )}
      >
        {state.inspectorEnabled && (
          <div className='border-b border-border px-4 py-3'>
            <div className='text-[10px] uppercase tracking-wider text-gray-400 mb-2'>Inspector options</div>
            <div className='space-y-2'>
              <ToggleRow
                label='Enable tooltip'
                checked={inspectorSettings.showTooltip}
                onCheckedChange={(v) => updateInspectorSetting({ showTooltip: v })}
                className='p-2'
              />
              <div className='rounded border border-border/40 bg-gray-800/30 p-2 space-y-1'>
                <ToggleRow
                  label='Style settings'
                  checked={inspectorSettings.showStyleSettings}
                  onCheckedChange={(v) => updateInspectorSetting({ showStyleSettings: v })}
                  className='border-none bg-transparent p-1'
                />
                <ToggleRow
                  label='Structure info'
                  checked={inspectorSettings.showStructureInfo}
                  onCheckedChange={(v) => updateInspectorSetting({ showStructureInfo: v })}
                  className='border-none bg-transparent p-1'
                />
                <ToggleRow
                  label='Identifiers'
                  checked={inspectorSettings.showIdentifiers}
                  onCheckedChange={(v) => updateInspectorSetting({ showIdentifiers: v })}
                  className='border-none bg-transparent p-1'
                />
                <ToggleRow
                  label='Visibility info'
                  checked={inspectorSettings.showVisibilityInfo}
                  onCheckedChange={(v) => updateInspectorSetting({ showVisibilityInfo: v })}
                  className='border-none bg-transparent p-1'
                />
                <ToggleRow
                  label='Connection info'
                  checked={inspectorSettings.showConnectionInfo}
                  onCheckedChange={(v) => updateInspectorSetting({ showConnectionInfo: v })}
                  className='border-none bg-transparent p-1'
                />
              </div>
            </div>
          </div>
        )}
        {!state.currentPage ? (<div className='flex-1 overflow-y-auto p-4'><p className='text-sm text-gray-500'>Select a page first.</p></div>) : !hasSelection ? (<PageSettingsTab />) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className='flex min-h-0 flex-1 flex-col overflow-hidden'>
            <TabsList className='mx-4 mt-3 w-[calc(100%-2rem)]'>
              <TabsTrigger value='settings' className='flex-1 text-xs'>Settings</TabsTrigger>
              <TabsTrigger value='animation' className='flex-1 text-xs'>Anim</TabsTrigger>
              <TabsTrigger value='cssAnimation' className='flex-1 text-xs'>CSS Anim</TabsTrigger>
              {showCustomCssTab && <TabsTrigger value='customCss' className='flex-1 text-xs'>CSS</TabsTrigger>}
              {showEventsTab && <TabsTrigger value='events' className='flex-1 text-xs'>Events</TabsTrigger>}
              {showConnectionsTab && <TabsTrigger value='connections' className='flex-1 text-xs'>Conn</TabsTrigger>}
              <TabsTrigger value='ai' className='flex-1 text-xs'>AI</TabsTrigger>
            </TabsList>
            <TabsContent value='settings' className='flex-1 overflow-y-auto p-4 mt-0'>
              {selectedSection && sectionDef ? (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-2'><Button onClick={handleCopySection} variant='outline' size='sm' className='text-xs'>Copy</Button><Button onClick={handleDuplicateSection} variant='outline' size='sm' className='text-xs'>Duplicate</Button></div>
                  {renderFieldGroups(groupSettingsFields(selectedSection.type === 'Grid' ? prependManagementFields(sectionDef.settingsSchema) : sectionDef.settingsSchema), selectedSection.settings, handleSectionSettingChangeWithGridColumns)}
                  <div className='rounded border border-border/40 bg-gray-900/40 p-3'>
                    <div className='flex gap-2'><Input value={sectionTemplateName} onChange={(e) => setSectionTemplateName(e.target.value)} placeholder='Name' className='h-8 text-xs' /><Input value={sectionTemplateCategory} onChange={(e) => setSectionTemplateCategory(e.target.value)} placeholder='Cat' className='h-8 text-xs' /></div>
                    <Button onClick={() => void handleSaveSectionTemplate()} size='sm' className='mt-2 w-full h-8' disabled={updateSetting.isPending}>Save Template</Button>
                  </div>
                  <Button onClick={handleRemoveSection} variant='destructive' size='sm' className='w-full'><Trash2 className='mr-2 size-4' />Remove Section</Button>
                </div>
              ) : selectedColumn && columnDef ? (
                <div className='space-y-4'>
                  {renderFieldGroups(groupSettingsFields(prependManagementFields(columnDef.settingsSchema)), columnSettingsForRender ?? selectedColumn.settings, handleColumnSettingChange, (f) => columnHeightMode === 'inherit' && f.key === 'height' ? { ...f, disabled: true } : f)}
                </div>
              ) : selectedBlock && blockDef ? (
                <div className='space-y-4'>
                  {isImageElementInContainer && backgroundTargetOptions.length > 1 && (
                    <div className='rounded border border-border/40 bg-gray-900/40 p-3 mb-4'>
                      <SelectSimple
                        value={currentBackgroundTarget}
                        onValueChange={(value: string) => handleBlockSettingChange('backgroundTarget', value)}
                        options={backgroundTargetOptions}
                        size='sm'
                        triggerClassName='h-8 bg-gray-800 border-border text-gray-200'
                      />
                    </div>
                  )}
                  {isImageElementInContainer && isInBackgroundMode ? (
                    renderFieldGroups(groupSettingsFields(prependManagementFields(IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS)), selectedBlock.settings, handleBlockSettingChange)
                  ) : (
                    renderFieldGroups(groupSettingsFields(prependManagementFields(blockDef.settingsSchema)), rowSettingsForRender ?? selectedBlock.settings, handleBlockSettingChange, (f) => (selectedBlock.type === 'AppEmbed' && f.key === 'appId') ? { ...f, options: appEmbedOptions } : (isRowBlock && rowHeightMode === 'inherit' && f.key === 'height') ? { ...f, disabled: true } : f)
                  )}
                  {isGridImageElement && !isInBackgroundMode && (
                    <div className='grid gap-2 border-t border-border/30 pt-4'>
                      {selectedParentColumn && <Button onClick={() => handleMakeBackground('column')} variant='outline' size='sm' className='w-full text-xs' disabled={!imageBackgroundSrc}>To Column</Button>}
                      <Button onClick={() => handleMakeBackground('grid')} variant='outline' size='sm' className='w-full text-xs' disabled={!imageBackgroundSrc}>To Grid</Button>
                    </div>
                  )}
                  <div className='border-t border-border/30 pt-4'>
                    <Button onClick={isRowBlock ? handleRemoveRow : handleRemoveBlock} variant='destructive' size='sm' className='w-full'><Trash2 className='mr-2 size-4' />{isRowBlock ? 'Remove Row' : 'Remove Block'}</Button>
                  </div>
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value='animation' className='flex-1 overflow-y-auto p-4 mt-0'><AnimationConfigPanel value={currentAnimationConfig} onChange={handleAnimationChange} /></TabsContent>
            <TabsContent value='cssAnimation' className='flex-1 overflow-y-auto p-4 mt-0'><CssAnimationConfigPanel value={currentCssAnimationConfig ?? {}} onChange={handleCssAnimationChange} /></TabsContent>
            <TabsContent value='ai' className='flex-1 overflow-y-auto p-4 mt-0'><ContentAiSection /></TabsContent>
            {showCustomCssTab && (
              <TabsContent value='customCss' className='flex-1 overflow-y-auto p-4 mt-0 space-y-3'>
                <CssAiSection />
                <Textarea value={customCssValue} onChange={(e) => handleCustomCssChange(e.target.value)} placeholder={'parent { \\n  outline: 1px dashed #4ade80;\\n}\\n\\nchildren { \\n  gap: 12px;\\n}'} className='min-h-[160px] font-mono text-xs' spellCheck={false} />
              </TabsContent>
            )}
            {showEventsTab && (<TabsContent value='events' className='flex-1 overflow-y-auto p-4 mt-0'><EventEffectsTab /></TabsContent>)}
            {showConnectionsTab && (<TabsContent value='connections' className='flex-1 overflow-y-auto p-4 mt-0'><ConnectionsTab /></TabsContent>)}
          </Tabs>
        )}
      </SidePanel>
    </InspectorAiProvider>
  );
}
