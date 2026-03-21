import { JSX } from 'react';

import { AdminRouteMapPage } from '@/features/admin/pages/AdminRouteMapPage';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return <AdminRouteMapPage />;
}
