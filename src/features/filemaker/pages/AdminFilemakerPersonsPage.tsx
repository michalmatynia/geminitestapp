'use client';

import React from 'react';

import { FilemakerPersonsListPanel } from '../components/page/FilemakerPersonsListPanel';
import { useAdminFilemakerPersonsListState } from '../hooks/useAdminFilemakerPersonsListState';

export function AdminFilemakerPersonsPage(): React.JSX.Element {
  const state = useAdminFilemakerPersonsListState();
  return <FilemakerPersonsListPanel {...state} />;
}
