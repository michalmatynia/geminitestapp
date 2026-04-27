'use client';

import React from 'react';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerAnyTextsSection } from '../shared/FilemakerAnyTextsSection';

export function OrganizationAnyTextsSection(): React.JSX.Element {
  const { linkedAnyTexts } = useAdminFilemakerOrganizationEditPageStateContext();

  return <FilemakerAnyTextsSection anyTexts={linkedAnyTexts} />;
}
