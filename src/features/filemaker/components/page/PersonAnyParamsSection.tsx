'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerAnyParamsSection } from '../shared/FilemakerAnyParamsSection';

export function PersonAnyParamsSection(): React.JSX.Element {
  const { linkedAnyParams, updateSetting } = useAdminFilemakerPersonEditPageStateContext();
  const { handleDeleteLinkedRecord, handleUpdateLinkedRecord } =
    useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerAnyParamsSection
      anyParams={linkedAnyParams}
      isSaving={updateSetting.isPending}
      onUpdateAnyParam={(id, patch) => handleUpdateLinkedRecord('any-param', id, patch)}
      onDeleteAnyParam={(id) => handleDeleteLinkedRecord('any-param', id)}
    />
  );
}
