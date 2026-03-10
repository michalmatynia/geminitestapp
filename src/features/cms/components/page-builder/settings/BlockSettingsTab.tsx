'use client';

import { Trash2 } from 'lucide-react';
import React, { useMemo, useCallback } from 'react';

import {
  usePageBuilderSelection,
  usePageBuilderDispatch,
} from '@/features/cms/hooks/usePageBuilderContext';
import {
  APP_EMBED_SETTING_KEY,
  type AppEmbedId,
  APP_EMBED_OPTIONS,
  DEFAULT_APP_EMBED_ID,
  KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS,
  getAppEmbedOption,
} from '@/shared/lib/app-embeds';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button } from '@/shared/ui';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  appendRuntimeVisibilityFields,
  prependManagementFields,
  groupSettingsFields,
  renderFieldGroups,
} from './field-group-helpers';
import { SettingsFormProvider } from './SettingsFormContext';
import { useComponentSettingsActions } from '../context/ComponentSettingsContext';
import { getBlockDefinition } from '../section-registry';



export function BlockSettingsTab(): React.JSX.Element | null {
  const dispatch = usePageBuilderDispatch();
  const selection = usePageBuilderSelection();
  const selectedBlock = selection.selectedBlock;
  const selectedParentSection = selection.selectedParentSection;
  const selectedParentColumn = selection.selectedParentColumn;
  const selectedParentRow = selection.selectedParentRow;
  const selectedParentBlock = selection.selectedParentBlock;

  const { handleBlockSettingChange } = useComponentSettingsActions();
  const settingsStore = useSettingsStore();

  const isRowBlock = selectedBlock?.type === 'Row' && selectedParentSection?.type === 'Grid';

  const rowHeightMode = (selectedBlock?.settings?.['heightMode'] as string) || 'inherit';
  const runtimeVisibilityMode =
    (selectedBlock?.settings?.['runtimeVisibilityMode'] as string) || 'always';
  const rowSettingsForRender = useMemo(
    () =>
      !isRowBlock || !selectedBlock
        ? null
        : rowHeightMode !== 'inherit'
          ? selectedBlock.settings
          : { ...selectedBlock.settings, height: 0 },
    [isRowBlock, selectedBlock, rowHeightMode]
  );

  const selectedAppId =
    selectedBlock?.type === 'AppEmbed'
      ? ((selectedBlock.settings['appId'] as string | undefined) ?? DEFAULT_APP_EMBED_ID)
      : null;
  const selectedAppOption = getAppEmbedOption(selectedAppId);

  const appEmbedOptions = useMemo((): { label: string; value: string }[] => {
    const enabled = parseJsonSetting<AppEmbedId[]>(settingsStore.get(APP_EMBED_SETTING_KEY), []);
    const options = APP_EMBED_OPTIONS.filter(
      (option) => enabled.includes(option.id) || option.id === selectedAppId
    ).map((option) => ({
      label: option.label,
      value: option.id,
    }));
    return options.length > 0 ? options : [{ label: 'No app embeds enabled', value: '' }];
  }, [selectedAppId, settingsStore]);

  const appEmbedConfigurationNote = useMemo((): React.JSX.Element | null => {
    if (selectedBlock?.type !== 'AppEmbed' || !selectedAppOption) {
      return null;
    }

    if (selectedAppOption.renderMode === 'internal-app') {
      return (
        <div className='rounded-xl border border-border/40 bg-card/20 px-3 py-2 text-xs text-gray-300'>
          <div className='font-medium text-white'>
            {selectedAppOption.label} mounts inside this CMS page.
          </div>
          <div className='mt-1 text-gray-400'>
            Leave Host page override blank to keep Kangur on the current page. To make it the first
            experience on HOME, add this block to the HOME page template zone.
          </div>
        </div>
      );
    }

    return (
      <div className='rounded-xl border border-border/40 bg-card/20 px-3 py-2 text-xs text-gray-300'>
        <div className='font-medium text-white'>
          {selectedAppOption.label} renders as an iframe.
        </div>
        <div className='mt-1 text-gray-400'>
          Provide the published embed URL for this app. CMS zoning still controls the surrounding
          header, footer, and layout.
        </div>
      </div>
    );
  }, [selectedAppOption, selectedBlock?.type]);

  const handleRemoveBlock = useCallback((): void => {
    if (!selectedBlock || !selectedParentSection) return;
    if (selectedParentBlock && selectedParentColumn)
      dispatch({
        type: 'REMOVE_ELEMENT_FROM_NESTED_BLOCK',
        sectionId: selectedParentSection.id,
        columnId: selectedParentColumn.id,
        parentBlockId: selectedParentBlock.id,
        elementId: selectedBlock.id,
      });
    else if (selectedParentBlock)
      dispatch({
        type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK',
        sectionId: selectedParentSection.id,
        parentBlockId: selectedParentBlock.id,
        elementId: selectedBlock.id,
      });
    else if (selectedParentColumn)
      dispatch({
        type: 'REMOVE_BLOCK_FROM_COLUMN',
        sectionId: selectedParentSection.id,
        columnId: selectedParentColumn.id,
        blockId: selectedBlock.id,
      });
    else if (selectedParentRow)
      dispatch({
        type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK',
        sectionId: selectedParentSection.id,
        parentBlockId: selectedParentRow.id,
        elementId: selectedBlock.id,
      });
    else
      dispatch({
        type: 'REMOVE_BLOCK',
        sectionId: selectedParentSection.id,
        blockId: selectedBlock.id,
      });
  }, [
    selectedBlock,
    selectedParentSection,
    selectedParentColumn,
    selectedParentRow,
    selectedParentBlock,
    dispatch,
  ]);

  const handleRemoveRow = useCallback(
    () =>
      isRowBlock &&
      selectedParentSection &&
      selectedBlock &&
      dispatch({
        type: 'REMOVE_GRID_ROW',
        sectionId: selectedParentSection.id,
        rowId: selectedBlock.id,
      }),
    [isRowBlock, selectedParentSection, selectedBlock, dispatch]
  );

  if (!selectedBlock) return null;
  const blockDef = getBlockDefinition(selectedBlock.type);
  if (!blockDef) return null;
  const blockSettingsForRender = rowSettingsForRender ?? selectedBlock.settings;

  return (
    <SettingsFormProvider values={blockSettingsForRender} onChange={handleBlockSettingChange}>
      <div className='space-y-4'>
        {appEmbedConfigurationNote}
        {renderFieldGroups(
          groupSettingsFields(
            appendRuntimeVisibilityFields(prependManagementFields(blockDef.settingsSchema))
          ),
          blockSettingsForRender,
          handleBlockSettingChange,
          (f) => {
            if (selectedBlock.type === 'AppEmbed') {
              if (f.key === 'appId') {
                return { ...f, options: appEmbedOptions };
              }

              if (f.key === 'entryPage') {
                return {
                  ...f,
                  options: [...KANGUR_APP_EMBED_ENTRY_PAGE_OPTIONS],
                  disabled: selectedAppOption?.id !== 'kangur',
                };
              }

              if (f.key === 'basePath') {
                return {
                  ...f,
                  disabled: selectedAppOption?.renderMode !== 'internal-app',
                };
              }

              if (f.key === 'embedUrl') {
                return {
                  ...f,
                  disabled: selectedAppOption?.renderMode !== 'iframe',
                };
              }
            }

            if (isRowBlock && rowHeightMode === 'inherit' && f.key === 'height') {
              return { ...f, disabled: true };
            }

            if (
              runtimeVisibilityMode === 'always' &&
              (f.key === 'runtimeVisibilitySource' ||
                f.key === 'runtimeVisibilityPath' ||
                f.key === 'runtimeVisibilityValue')
            ) {
              return { ...f, disabled: true };
            }

            if (
              (runtimeVisibilityMode === 'truthy' || runtimeVisibilityMode === 'falsy') &&
              f.key === 'runtimeVisibilityValue'
            ) {
              return { ...f, disabled: true };
            }

            return f;
          }
        )}
        <div className='border-t border-border/30 pt-4'>
          <Button
            onClick={isRowBlock ? handleRemoveRow : handleRemoveBlock}
            variant='destructive'
            size='sm'
            className='w-full'
          >
            <Trash2 className='mr-2 size-4' />
            {isRowBlock ? 'Remove Row' : 'Remove Block'}
          </Button>
        </div>
      </div>
    </SettingsFormProvider>
  );
}
