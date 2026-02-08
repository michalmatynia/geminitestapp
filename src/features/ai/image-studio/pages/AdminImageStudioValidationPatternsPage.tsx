'use client';

import { AdminPromptEngineValidationPatternsPage } from '@/features/prompt-engine';

type AdminImageStudioValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
};

export function AdminImageStudioValidationPatternsPage({
  embedded = false,
  onSaved,
}: AdminImageStudioValidationPatternsPageProps): React.JSX.Element {
  const onSavedProp = onSaved ? { onSaved } : {};

  return (
    <AdminPromptEngineValidationPatternsPage
      embedded={embedded}
      {...onSavedProp}
      eyebrow='AI · Image Studio'
      backLinkHref='/admin/image-studio'
      backLinkLabel='Back to Studio'
    />
  );
}
