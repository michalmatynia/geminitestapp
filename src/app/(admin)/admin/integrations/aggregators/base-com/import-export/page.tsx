import { JSX } from 'react';

import { ExportsPage } from '@/features/data-import-export/public';

export default function Page(): JSX.Element {
  return (
    <div className='w-full py-2'>
      <ExportsPage />
    </div>
  );
}
