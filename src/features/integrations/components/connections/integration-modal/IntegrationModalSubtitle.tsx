import React from 'react';

type IntegrationModalSubtitleProps = {
  isBaselinker: boolean;
  isTradera: boolean;
};

export function IntegrationModalSubtitle({
  isBaselinker,
  isTradera,
}: IntegrationModalSubtitleProps): string {
  if (isBaselinker) {
    return 'Manage connections and warehouse sync settings.';
  }
  if (isTradera) {
    return 'Manage connections via browser automation (Playwright).';
  }
  return 'Manage connections and marketplace API settings.';
}
