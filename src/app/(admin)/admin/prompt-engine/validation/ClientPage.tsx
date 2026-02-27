'use client';

import dynamic from 'next/dynamic';

const AdminPromptEngineValidationPatternsPage = dynamic(
  () =>
    import('@/features/prompt-engine').then((mod) => {
      const Page = mod.AdminPromptEngineValidationPatternsPage;
      return Page;
    }),
  {
    ssr: false,
    loading: () => (
      <div className='p-6 text-sm text-muted-foreground'>
        Loading validation patterns...
      </div>
    ),
  },
);

export default function ClientPage(): React.JSX.Element {
  return <AdminPromptEngineValidationPatternsPage />;
}
