import { connection } from 'next/server';
import { JSX } from 'react';

import { Asset3DListPage } from '@/features/viewer3d/pages.public';

export default async function Page(): Promise<JSX.Element> {
  await connection();
  return <Asset3DListPage />;
}
