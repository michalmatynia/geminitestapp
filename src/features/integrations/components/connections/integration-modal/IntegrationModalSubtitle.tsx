import React from 'react';

import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

export function IntegrationModalSubtitle(): React.JSX.Element {
  const { isBaselinker, isTradera, isVinted, is1688, isPracuj, showPlaywright } =
    useIntegrationModalViewContext();

  if (isBaselinker) {
    return <>Manage connections and warehouse sync settings.</>;
  }
  if (!showPlaywright) {
    return <>Manage connections and marketplace API settings.</>;
  }
  if (is1688) {
    return <>Manage connections via browser automation (Playwright).</>;
  }
  if (isPracuj) {
    return <>Manage job-search platform connections and reusable browser authentication.</>;
  }
  if ([isTradera, isVinted].some((value) => value)) {
    return <>Manage connections and Step Sequencer-backed browser automation.</>;
  }
  return <>Manage connections and marketplace API settings.</>;
}
