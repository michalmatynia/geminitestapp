'use client';

import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerContractsSection } from '../shared/FilemakerContractsSection';

export function PersonContractsSection(): React.JSX.Element {
  const { linkedContracts } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerContractsSection contracts={linkedContracts} />;
}
