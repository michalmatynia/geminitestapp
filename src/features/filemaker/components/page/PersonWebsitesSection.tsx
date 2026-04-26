import React from 'react';

import { useAdminFilemakerPersonEditPageStateContext } from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerLinkedWebsitesSection } from '../shared/FilemakerLinkedWebsitesSection';

export function PersonWebsitesSection(): React.JSX.Element {
  const { websites } = useAdminFilemakerPersonEditPageStateContext();

  return <FilemakerLinkedWebsitesSection websites={websites} />;
}
