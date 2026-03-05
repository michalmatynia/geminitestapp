import { JSX } from 'react';

import { ImportsPage } from '@/features/data-import-export/';

export default function Page(): JSX.Element {
  return (
    <div className='w-full py-2'>
      <ImportsPage />
    </div>
  );
}
