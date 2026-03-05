'use client';

import React from 'react';

import { AdminPromptEngineValidationPatternsPage } from '@/features/prompt-engine';

type AdminImageStudioValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
};

type AdminImageStudioValidationPatternsRuntimeValue = {
  embedded: boolean;
  onSaved?: () => void;
};

const AdminImageStudioValidationPatternsRuntimeContext =
  React.createContext<AdminImageStudioValidationPatternsRuntimeValue | null>(null);

function useAdminImageStudioValidationPatternsRuntime(): AdminImageStudioValidationPatternsRuntimeValue {
  const runtime = React.useContext(AdminImageStudioValidationPatternsRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useAdminImageStudioValidationPatternsRuntime must be used within AdminImageStudioValidationPatternsRuntimeContext.Provider'
    );
  }
  return runtime;
}

function AdminImageStudioValidationPatternsShell(): React.JSX.Element {
  const { embedded, onSaved } = useAdminImageStudioValidationPatternsRuntime();
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

export function AdminImageStudioValidationPatternsPage({
  embedded = false,
  onSaved,
}: AdminImageStudioValidationPatternsPageProps): React.JSX.Element {
  return (
    <AdminImageStudioValidationPatternsRuntimeContext.Provider value={{ embedded, onSaved }}>
      <AdminImageStudioValidationPatternsShell />
    </AdminImageStudioValidationPatternsRuntimeContext.Provider>
  );
}
