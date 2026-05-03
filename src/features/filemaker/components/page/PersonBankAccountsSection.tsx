'use client';

import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerBankAccountsSection } from '../shared/FilemakerBankAccountsSection';

export function PersonBankAccountsSection(): React.JSX.Element {
  const { linkedBankAccounts } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerBankAccountsSection bankAccounts={linkedBankAccounts} />;
}
