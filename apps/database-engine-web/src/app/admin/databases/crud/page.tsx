import { type JSX } from 'react';

import { DatabaseOperationsPage } from '@/features/database/public';

export default function Page(): JSX.Element {
  return <DatabaseOperationsPage defaultTab='crud' />;
}
