'use client';

import React from 'react';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerDocumentsSection } from '../shared/FilemakerDocumentsSection';

export function OrganizationDocumentsSection(): React.JSX.Element {
  const { linkedDocuments } = useAdminFilemakerOrganizationEditPageStateContext();

  return <FilemakerDocumentsSection documents={linkedDocuments} />;
}
