import { safeHtml } from '@/shared/lib/security/safe-html';

import type { ReactNode } from 'react';

// Shared element ID used by the server renderer and the client hydration reader.
export const KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID = 'kangur-auth-bootstrap-data';

// Renders a JSON data island (<script type="application/json">) instead of an
// executable inline script. React 19 warns when <script> tags without a type
// are rendered inside components because their content is not executed during
// client-side rendering. A JSON data island avoids this warning entirely while
// still making the SSR auth data available to the client bootstrap reader.
export function renderKangurAuthBootstrapScript(
  bootstrapJson: string | null | undefined
): ReactNode {
  if (!bootstrapJson) return null;

  return (
    <script
      id={KANGUR_AUTH_BOOTSTRAP_ELEMENT_ID}
      type='application/json'
      dangerouslySetInnerHTML={{ __html: safeHtml(bootstrapJson) }}
    />
  );
}
