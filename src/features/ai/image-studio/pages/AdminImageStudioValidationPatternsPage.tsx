"use client";

import { AdminPromptEngineValidationPatternsPage } from "@/features/prompt-engine";

type AdminImageStudioValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
};

export function AdminImageStudioValidationPatternsPage({
  embedded = false,
  onSaved,
}: AdminImageStudioValidationPatternsPageProps): React.JSX.Element {
  return (
    <AdminPromptEngineValidationPatternsPage
      embedded={embedded}
      onSaved={onSaved}
      eyebrow="AI · Image Studio"
      backLinkHref="/admin/image-studio"
      backLinkLabel="Back to Studio"
    />
  );
}
