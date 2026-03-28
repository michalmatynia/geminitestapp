import { JSX } from 'react';

import CmsHomePage from '@/features/cms/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return <CmsHomePage />;
}
