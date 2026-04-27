import React from 'react';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerAnyParamsSection } from '../shared/FilemakerAnyParamsSection';

export function OrganizationAnyParamsSection(): React.JSX.Element {
  const { linkedAnyParams } = useAdminFilemakerOrganizationEditPageStateContext();

  return <FilemakerAnyParamsSection anyParams={linkedAnyParams} />;
}
