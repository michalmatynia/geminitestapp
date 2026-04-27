'use client';

import React from 'react';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerBankAccountsSection } from '../shared/FilemakerBankAccountsSection';

export function OrganizationBankAccountsSection(): React.JSX.Element {
  const { linkedBankAccounts } = useAdminFilemakerOrganizationEditPageStateContext();

  return <FilemakerBankAccountsSection bankAccounts={linkedBankAccounts} />;
}
