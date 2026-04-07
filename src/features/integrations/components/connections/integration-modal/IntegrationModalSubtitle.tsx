import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera, isVinted, showPlaywright } = useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (showPlaywright && (isTradera || isVinted)) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  if (isTradera) {
    return <>Manage connections via Tradera API credentials and tokens.</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
