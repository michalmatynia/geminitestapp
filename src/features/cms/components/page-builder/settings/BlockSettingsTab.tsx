'use client';

import React, { useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
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
import { getBlockDefinition } from '../section-registry';
import {
  usePageBuilderSelection,
  usePageBuilderDispatch,
} from '../../../hooks/usePageBuilderContext';
import { useComponentSettingsActions } from '../context/ComponentSettingsContext';

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
  const rowSettingsForRender = useMemo(
    () =>
      !isRowBlock || !selectedBlock
        ? null
        : rowHeightMode !== 'inherit'
          ? selectedBlock.settings
          : { ...selectedBlock.settings, height: 0 },
    [isRowBlock, selectedBlock, rowHeightMode]
  );

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
        {renderFieldGroups(
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
