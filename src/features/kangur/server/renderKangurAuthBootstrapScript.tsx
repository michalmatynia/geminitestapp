import { safeHtml } from '@/shared/lib/security/safe-html';

import type { ReactNode } from 'react';

export function renderKangurAuthBootstrapScript(
  bootstrapScript: string | null | undefined
): ReactNode {
  if (
    bootstrapScript === null ||
    bootstrapScript === undefined ||
    bootstrapScript === ''
  ) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: safeHtml(bootstrapScript),
      }}
      style={{ display: 'none' }}
    />
  );
}
