import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerAnyParamsSection } from '../shared/FilemakerAnyParamsSection';

export function PersonAnyParamsSection(): React.JSX.Element {
  const { linkedAnyParams } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerAnyParamsSection anyParams={linkedAnyParams} />;
}
