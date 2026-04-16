import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera, isVinted, is1688, showPlaywright } =
    useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (showPlaywright && (isTradera || isVinted || is1688)) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  if (isTradera) {
    return <>Manage connections via Tradera API credentials and tokens.</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
