'use client';

import dynamic from 'next/dynamic';

const AdminImageStudioValidationPatternsPage = dynamic(
  () =>
    import('@/features/ai').then(
      (mod: typeof import('@/features/ai')) =>
        mod.AdminImageStudioValidationPatternsPage
    ),
  {
    ssr: false,
    loading: () => (
      <div className='p-6 text-sm text-muted-foreground'>Loading validation patterns...</div>
    ),
  }
);

export default function ClientPage(): React.JSX.Element {
  return <AdminImageStudioValidationPatternsPage />;
}
