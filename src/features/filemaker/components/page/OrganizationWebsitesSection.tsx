import React from 'react';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerLinkedWebsitesSection } from '../shared/FilemakerLinkedWebsitesSection';

export function OrganizationWebsitesSection(): React.JSX.Element {
  const { linkedWebsites } = useAdminFilemakerOrganizationEditPageStateContext();

  return <FilemakerLinkedWebsitesSection websites={linkedWebsites} />;
}
