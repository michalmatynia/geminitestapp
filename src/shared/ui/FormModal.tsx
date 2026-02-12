'use client';

import { AppModal } from './app-modal';
import { Button } from './button'; // Assuming Button is available

import type { ReactNode } from 'react';

interface FormModalProps {

  open: boolean;

  onClose: () => void;

  title: string;

  children: ReactNode;

  onSave: () => void;

  isSaving?: boolean;

  saveText?: string;

  cancelText?: string;

  formRef?: React.RefObject<HTMLFormElement | null>;

  size?: 'sm' | 'md' | 'lg' | 'xl';

  actions?: ReactNode; // Additional actions for the header

}



export function FormModal({

  open,

  onClose,

  title,

  children,

  onSave,

  isSaving = false,

  saveText = 'Save',

  cancelText = 'Cancel',

  formRef,

  size = 'md',

  actions,

}: FormModalProps): React.JSX.Element | null {

  if (!open) return null;



  const saveButton = formRef ? (
    <Button
      type='button' // Use type="button" as we'll use onClick to trigger submit
      onClick={() => formRef.current?.requestSubmit()} // Use ref to trigger form submission
      disabled={isSaving}
      variant='primary'
      className='min-w-[100px]'
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  ) : (
    <Button
      onClick={onSave}
      disabled={isSaving}
      variant='primary'
      className='min-w-[100px]'
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  );

  // Combine save button, original actions, and cancel button for AppModal's headerActions
  const headerActions = (
    <>
      {saveButton}
      {actions} {/* Include any additional actions passed */}
      <Button
        type='button'
        onClick={onClose}
        variant='outline'
        className='min-w-[100px]'
      >
        {cancelText}
      </Button>
    </>
  );



  return (

    <AppModal

      open={open}

      onOpenChange={onClose} // Pass onClose directly to AppModal's onOpenChange

      title={title} // Pass title to AppModal

      size={size}

      headerActions={headerActions} // Pass the constructed actions to AppModal

    >

      {children}

    </AppModal>

  );

}
