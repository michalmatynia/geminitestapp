'use client';

import dynamic from 'next/dynamic';

// Dynamically import the PageBuilderPage to avoid server-side rendering issues
const PageBuilderPage = dynamic(
  () => import('@/features/cms/pages/builder/PageBuilderPage'),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4'></div>
          <p className='text-sm text-gray-600'>Loading Page Builder...</p>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return <PageBuilderPage />;
}
