'use client';

import React from 'react';

import { FilemakerOrganizationsListPanel } from '../components/page/FilemakerOrganizationsListPanel';
import { useAdminFilemakerOrganizationsListState } from '../hooks/useAdminFilemakerOrganizationsListState';

export function AdminFilemakerOrganizationsPage(): React.JSX.Element {
  const state = useAdminFilemakerOrganizationsListState();

  return (
    <FilemakerOrganizationsListPanel {...state} />
  );
}
