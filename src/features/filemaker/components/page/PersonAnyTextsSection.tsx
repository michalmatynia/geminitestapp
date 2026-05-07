'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerAnyTextsSection } from '../shared/FilemakerAnyTextsSection';

export function PersonAnyTextsSection(): React.JSX.Element {
  const { linkedAnyTexts, updateSetting } = useAdminFilemakerPersonEditPageStateContext();
  const { handleDeleteLinkedRecord, handleUpdateLinkedRecord } =
    useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerAnyTextsSection
      anyTexts={linkedAnyTexts}
      isSaving={updateSetting.isPending}
      onUpdateAnyText={(id, patch) => handleUpdateLinkedRecord('any-text', id, patch)}
      onDeleteAnyText={(id) => handleDeleteLinkedRecord('any-text', id)}
    />
  );
}
