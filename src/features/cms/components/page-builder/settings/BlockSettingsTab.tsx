'use client';

import React, { useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, SelectSimple } from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import {
  APP_EMBED_SETTING_KEY,
  type AppEmbedId,
  APP_EMBED_OPTIONS,
} from '@/features/app-embeds/lib/constants';

import { SettingsFormProvider } from './SettingsFormContext';
import {
  prependManagementFields,
  groupSettingsFields,
  renderFieldGroups,
} from './field-group-helpers';
import {
  getBlockDefinition,
  IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS,
  getImageBackgroundTargetOptions,
  type ImageBackgroundTarget,
} from '../section-registry';
import { usePageBuilderSelection, usePageBuilderDispatch } from '../../../hooks/usePageBuilderContext';
import { useComponentSettingsContext } from '../context/ComponentSettingsContext';
import type { BlockInstance } from '@/shared/contracts/cms';

export function BlockSettingsTab(): React.JSX.Element | null {
  const dispatch = usePageBuilderDispatch();
  const selection = usePageBuilderSelection();
  const selectedBlock = selection.selectedBlock;
  const selectedParentSection = selection.selectedParentSection;
  const selectedParentColumn = selection.selectedParentColumn;
  const selectedParentRow = selection.selectedParentRow;
  const selectedParentBlock = selection.selectedParentBlock;

  const { handleBlockSettingChange } = useComponentSettingsContext();
  const settingsStore = useSettingsStore();

  const isRowBlock = selectedBlock?.type === 'Row' && selectedParentSection?.type === 'Grid';
  const selectedGridRow = useMemo<BlockInstance | null>(() => {
    if (selectedParentSection?.type !== 'Grid' || !selectedParentColumn) return null;
    return (
      selectedParentSection.blocks.find(
        (b: BlockInstance) =>
          b.type === 'Row' &&
          (b.blocks ?? []).some((c: BlockInstance) => c.id === selectedParentColumn.id)
      ) ?? null
    );
  }, [selectedParentSection, selectedParentColumn]);

  const rowHeightMode = (selectedBlock?.settings?.['heightMode'] as string) || 'inherit';
  const rowSettingsForRender = useMemo(
    () =>
      !isRowBlock || !selectedBlock
        ? null
        : rowHeightMode !== 'inherit'
          ? selectedBlock.settings
          : { ...selectedBlock.settings, height: 0 },
    [isRowBlock, selectedBlock, rowHeightMode]
  );

  const isGridImageElement =
    selectedBlock?.type === 'ImageElement' &&
    selectedParentSection?.type === 'Grid' &&
    !selectedParentBlock;
  const imageBackgroundSrc = (selectedBlock?.settings?.['src'] as string) || '';
  const isImageElementInContainer =
    selectedBlock?.type === 'ImageElement' &&
    selectedParentSection?.type === 'Grid' &&
    !selectedParentBlock;
  const currentBackgroundTarget =
    (selectedBlock?.settings?.['backgroundTarget'] as ImageBackgroundTarget) || 'none';
  const isInBackgroundMode = currentBackgroundTarget !== 'none';

  const backgroundTargetOptions = useMemo(() => {
    if (!isImageElementInContainer) return [];
    return getImageBackgroundTargetOptions(
      selectedParentSection?.type === 'Grid',
      Boolean(selectedGridRow),
      Boolean(selectedParentColumn)
    );
  }, [isImageElementInContainer, selectedParentSection, selectedGridRow, selectedParentColumn]);

  const appEmbedOptions = useMemo((): { label: string; value: string }[] => {
    const enabled = parseJsonSetting<AppEmbedId[]>(settingsStore.get(APP_EMBED_SETTING_KEY), []);
    const options = APP_EMBED_OPTIONS.filter((o) => enabled.includes(o.id)).map((o) => ({
      label: o.label,
      value: o.id,
    }));
    return options.length > 0 ? options : [{ label: 'No app embeds enabled', value: '' }];
  }, [settingsStore]);

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

  const handleMakeBackground = useCallback(
    (target: 'grid' | 'row' | 'column'): void => {
      if (
        selectedBlock?.type !== 'ImageElement' ||
        selectedParentSection?.type !== 'Grid' ||
        !imageBackgroundSrc ||
        selectedParentBlock
      )
        return;
      const backgroundImage = { ...selectedBlock.settings };
      if (target === 'grid')
        dispatch({
          type: 'UPDATE_SECTION_SETTINGS',
          sectionId: selectedParentSection.id,
          settings: { backgroundImage },
        });
      else if (target === 'row') {
        if (selectedGridRow)
          dispatch({
            type: 'UPDATE_BLOCK_SETTINGS',
            sectionId: selectedParentSection.id,
            blockId: selectedGridRow.id,
            settings: { backgroundImage },
          });
      } else {
        if (selectedParentColumn)
          dispatch({
            type: 'UPDATE_COLUMN_SETTINGS',
            sectionId: selectedParentSection.id,
            columnId: selectedParentColumn.id,
            settings: { backgroundImage },
          });
      }
      if (selectedParentColumn)
        dispatch({
          type: 'REMOVE_BLOCK_FROM_COLUMN',
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          blockId: selectedBlock.id,
        });
      else
        dispatch({
          type: 'REMOVE_BLOCK',
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
        });
    },
    [
      dispatch,
      imageBackgroundSrc,
      selectedBlock,
      selectedGridRow,
      selectedParentBlock,
      selectedParentColumn,
      selectedParentSection,
    ]
  );

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
        {isImageElementInContainer && isInBackgroundMode
          ? renderFieldGroups(
            groupSettingsFields(prependManagementFields(IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS)),
            blockSettingsForRender,
            handleBlockSettingChange
          )
          : renderFieldGroups(
            groupSettingsFields(prependManagementFields(blockDef.settingsSchema)),
            blockSettingsForRender,
            handleBlockSettingChange,
            (f) =>
              selectedBlock.type === 'AppEmbed' && f.key === 'appId'
                ? { ...f, options: appEmbedOptions }
                : isRowBlock && rowHeightMode === 'inherit' && f.key === 'height'
                  ? { ...f, disabled: true }
                  : f
          )}
        {isGridImageElement && !isInBackgroundMode && (
          <div className='grid gap-2 border-t border-border/30 pt-4'>
            {selectedParentColumn && (
              <Button
                onClick={() => handleMakeBackground('column')}
                variant='outline'
                size='sm'
                className='w-full text-xs'
                disabled={!imageBackgroundSrc}
              >
                To Column
              </Button>
            )}
            <Button
              onClick={() => handleMakeBackground('grid')}
              variant='outline'
              size='sm'
              className='w-full text-xs'
              disabled={!imageBackgroundSrc}
            >
              To Grid
            </Button>
          </div>
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
