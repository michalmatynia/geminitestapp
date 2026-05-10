import { FormSection } from '@/features/kangur/shared/ui';
import React from 'react';

export function AdminPanel({ title, description, children, className }: { title: string, description: string, children: React.ReactNode, className?: string }) {
  return (
    <FormSection title={title} description={description} className={className}>
      {children}
    </FormSection>
  );
}
