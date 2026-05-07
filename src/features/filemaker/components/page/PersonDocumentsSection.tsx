'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerDocumentsSection } from '../shared/FilemakerDocumentsSection';

export function PersonDocumentsSection(): React.JSX.Element {
  const { linkedDocuments, updateSetting } = useAdminFilemakerPersonEditPageStateContext();
  const { handleDeleteLinkedRecord, handleUpdateLinkedRecord } =
    useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerDocumentsSection
      documents={linkedDocuments}
      isSaving={updateSetting.isPending}
      onUpdateDocument={(id, patch) => handleUpdateLinkedRecord('document', id, patch)}
      onDeleteDocument={(id) => handleDeleteLinkedRecord('document', id)}
    />
  );
}
