'use client';

import dynamic from 'next/dynamic';

const AdminImageStudioValidationPatternsPage = dynamic(
  () =>
    import('@/features/ai/image-studio').then(
      (mod: typeof import('@/features/ai/image-studio')) =>
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
