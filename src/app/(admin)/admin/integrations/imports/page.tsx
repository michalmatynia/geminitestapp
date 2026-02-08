import { JSX } from 'react';

import { ImportsPage } from '@/features/data-import-export';

export default function Page(): JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <ImportsPage />
    </div>
  );
}
