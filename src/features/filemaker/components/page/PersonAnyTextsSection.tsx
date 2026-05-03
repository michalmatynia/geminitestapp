'use client';

import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerAnyTextsSection } from '../shared/FilemakerAnyTextsSection';

export function PersonAnyTextsSection(): React.JSX.Element {
  const { linkedAnyTexts } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerAnyTextsSection anyTexts={linkedAnyTexts} />;
}
