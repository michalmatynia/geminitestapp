import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera, showPlaywright } = useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (isTradera && showPlaywright) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  if (isTradera) {
    return <>Manage connections via Tradera API credentials and tokens.</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
