import React from 'react';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { FilemakerLinkedWebsitesSection } from '../shared/FilemakerLinkedWebsitesSection';

export function OrganizationWebsitesSection(): React.JSX.Element {
  const { isWebsiteSocialScrapeRunning, linkedWebsites } =
    useAdminFilemakerOrganizationEditPageStateContext();
  const { handleWebsiteSocialScrape } =
    useAdminFilemakerOrganizationEditPageActionsContext();

  return (
    <FilemakerLinkedWebsitesSection
      isDiscoveringWebsiteSocial={isWebsiteSocialScrapeRunning}
      websites={linkedWebsites}
      onDiscoverWebsiteSocial={() => {
        void handleWebsiteSocialScrape();
      }}
    />
  );
}
