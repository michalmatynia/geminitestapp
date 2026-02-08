import Link from 'next/link';
import { JSX } from 'react';

export default function NotFound(): JSX.Element {
  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-200'>
      <h1 className='text-2xl font-semibold text-gray-100'>Page not found</h1>
      <p className='max-w-md text-sm text-gray-400'>
        We couldn&apos;t find the page you were looking for.
      </p>
      <Link
        href='/'
        className='inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700'
      >
        Go Home
      </Link>
    </div>
  );
}
