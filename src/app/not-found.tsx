import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import type { JSX } from 'react';

export default async function NotFound(): Promise<JSX.Element> {
  const translations = await getTranslations('NotFound');

  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-200'>
      <h1 className='text-2xl font-semibold text-gray-100'>{translations('title')}</h1>
      <p className='max-w-md text-sm text-gray-400'>
        {translations('description')}
      </p>
      <Link
        href='/'
        className='inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700'
      >
        {translations('goHome')}
      </Link>
    </div>
  );
}
