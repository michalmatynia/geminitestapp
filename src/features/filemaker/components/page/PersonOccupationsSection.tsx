'use client';

import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerPersonOccupationsSection } from '../shared/FilemakerPersonOccupationsSection';

export function PersonOccupationsSection(): React.JSX.Element {
  const { linkedOccupations } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerPersonOccupationsSection occupations={linkedOccupations} />;
}
