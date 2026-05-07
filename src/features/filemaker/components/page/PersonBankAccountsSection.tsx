'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerBankAccountsSection } from '../shared/FilemakerBankAccountsSection';

export function PersonBankAccountsSection(): React.JSX.Element {
  const { linkedBankAccounts, updateSetting } = useAdminFilemakerPersonEditPageStateContext();
  const { handleDeleteLinkedRecord, handleUpdateLinkedRecord } =
    useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerBankAccountsSection
      bankAccounts={linkedBankAccounts}
      isSaving={updateSetting.isPending}
      onUpdateBankAccount={(id, patch) => handleUpdateLinkedRecord('bank-account', id, patch)}
      onDeleteBankAccount={(id) => handleDeleteLinkedRecord('bank-account', id)}
    />
  );
}
