
import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/primitives.public';

export function StepFormHeader({ isEditing }: { isEditing: boolean }): React.JSX.Element {
  return (
    <DialogHeader>
      <DialogTitle>{isEditing ? 'Edit Step' : 'New Step'}</DialogTitle>
      <DialogDescription>
        {isEditing
          ? 'Update the step parameters and scope.'
          : 'Define a reusable browser automation step.'}
      </DialogDescription>
    </DialogHeader>
  );
}
