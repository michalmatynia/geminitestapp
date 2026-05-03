'use client';

import React from 'react';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerAddressesSection } from './OrganizationAddressesSection';

export function PersonAddressesSection(): React.JSX.Element {
  const { countries, database, editableAddresses } =
    useAdminFilemakerPersonEditPageStateContext();
  const { setEditableAddresses } = useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FilemakerAddressesSection
      countries={countries}
      databaseAddresses={database.addresses}
      editableAddresses={editableAddresses}
      setEditableAddresses={setEditableAddresses}
    />
  );
}
