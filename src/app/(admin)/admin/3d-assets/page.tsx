import { connection } from 'next/server';
import { JSX } from 'react';

import { Admin3DAssetsPage } from '@/features/viewer3d/pages.public';

export default async function Page(): Promise<JSX.Element> {
  await connection();
  return <Admin3DAssetsPage />;
}
