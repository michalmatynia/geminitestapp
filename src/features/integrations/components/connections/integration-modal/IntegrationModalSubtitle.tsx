import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera, isVinted, is1688, showPlaywright } =
    useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (showPlaywright && is1688) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  if (showPlaywright && (isTradera || isVinted)) {
    return <>Manage connections and Step Sequencer-backed browser automation.</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
