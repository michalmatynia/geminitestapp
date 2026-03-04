'use client';

import React, { useMemo } from 'react';
import { SettingsFormProvider } from './SettingsFormContext';
import {
  prependManagementFields,
  groupSettingsFields,
  renderFieldGroups,
} from './field-group-helpers';
import { getBlockDefinition } from '../section-registry';
import { usePageBuilderSelection } from '../../../hooks/usePageBuilderContext';
import { useComponentSettingsContext } from '../context/ComponentSettingsContext';

export function ColumnSettingsTab(): React.JSX.Element | null {
  const { selectedColumn } = usePageBuilderSelection();
  const { handleColumnSettingChange } = useComponentSettingsContext();

  const columnHeightMode = (selectedColumn?.settings?.['heightMode'] as string) || 'inherit';
  const columnSettingsForRender = useMemo(
    () =>
      !selectedColumn
        ? null
        : columnHeightMode !== 'inherit'
          ? selectedColumn.settings
          : { ...selectedColumn.settings, height: 0 },
    [selectedColumn, columnHeightMode]
  );

  if (!selectedColumn) return null;
  const columnDef = getBlockDefinition('Column');
  if (!columnDef) return null;
  const columnSettings = columnSettingsForRender ?? selectedColumn.settings;

  return (
    <SettingsFormProvider values={columnSettings} onChange={handleColumnSettingChange}>
      <div className='space-y-4'>
        {renderFieldGroups(
          groupSettingsFields(prependManagementFields(columnDef.settingsSchema)),
          columnSettings,
          handleColumnSettingChange,
          (f) =>
            columnHeightMode === 'inherit' && f.key === 'height' ? { ...f, disabled: true } : f
        )}
      </div>
    </SettingsFormProvider>
  );
}
