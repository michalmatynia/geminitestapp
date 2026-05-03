import type { JSX } from 'react';

export default function NotFound(): JSX.Element {
  return (
    <div className='flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center'>
      <h1 className='text-2xl font-semibold'>404</h1>
      <p className='text-sm text-gray-500'>Page not found</p>
      <a
        href='/kangur'
        className='inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700'
      >
        Go home
      </a>
    </div>
  );
}
