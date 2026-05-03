import { type JSX } from 'react';

import { SelectorRegistryPage } from '@/features/integrations/admin.public';

export default function Page(): JSX.Element {
  return <SelectorRegistryPage initialNamespace='tradera' />;
}
