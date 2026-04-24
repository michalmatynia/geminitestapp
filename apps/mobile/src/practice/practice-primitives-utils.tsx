import type { Href } from 'expo-router';
import React from 'react';
import { KangurMobileLinkButton as LinkButton } from './duels-primitives';

export function renderPracticeLink({
  href,
  label,
}: {
  href: Href | null;
  label: string;
}): React.JSX.Element | null {
  if (href !== null) {
    return (
      <LinkButton
        href={href}
        label={label}
        style={{ paddingHorizontal: 12 }}
        tone='secondary'
        verticalPadding={9}
      />
    );
  }

  return null;
}
