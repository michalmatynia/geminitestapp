import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera } = useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (isTradera) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
