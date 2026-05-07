'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerPersonOccupationsSection } from '../shared/FilemakerPersonOccupationsSection';

export function PersonOccupationsSection(): React.JSX.Element {
  const { linkedOccupations, updateSetting } = useAdminFilemakerPersonEditPageStateContext();
  const { handleDeleteLinkedRecord, handleUpdateLinkedRecord } =
    useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerPersonOccupationsSection
      occupations={linkedOccupations}
      isSaving={updateSetting.isPending}
      onUpdateOccupation={(id, patch) => handleUpdateLinkedRecord('occupation', id, patch)}
      onDeleteOccupation={(id) => handleDeleteLinkedRecord('occupation', id)}
    />
  );
}
