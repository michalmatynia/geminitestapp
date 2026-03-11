import * as React from 'react';

export const formatAdminAiEyebrow = (section: string): string => `AI · ${section}`;

type AdminAiEyebrowProps = {
  section: string;
};

export function AdminAiEyebrow({ section }: AdminAiEyebrowProps): React.JSX.Element {
  return <>{formatAdminAiEyebrow(section)}</>;
}
