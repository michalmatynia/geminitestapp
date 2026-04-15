import { type JSX } from 'react';

import { PlaywrightIntegrationPage } from '@/features/integrations/admin.public';

export default function Page(): JSX.Element {
  return <PlaywrightIntegrationPage focusSection='script' />;
}
