'use client';

import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerDocumentsSection } from '../shared/FilemakerDocumentsSection';

export function PersonDocumentsSection(): React.JSX.Element {
  const { linkedDocuments } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerDocumentsSection documents={linkedDocuments} />;
}
