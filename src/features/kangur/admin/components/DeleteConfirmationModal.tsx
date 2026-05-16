import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { type KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';

interface DeleteConfirmationModalProps {
  deleteTarget: { section: KangurLessonSection; subsectionId?: string } | null;
  onCancel: () => void;
  onConfirm: () => void;
  isSaving: boolean;
}

export function DeleteConfirmationModal({ 
    deleteTarget, 
    onCancel, 
    onConfirm, 
    isSaving 
}: DeleteConfirmationModalProps): React.JSX.Element | null {
    if (!deleteTarget) return null;
    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='w-full max-w-sm rounded-xl border border-border/60 bg-background p-5 shadow-xl'>
                <div className='text-sm font-semibold text-foreground'>Delete section item?</div>
                <div className='mt-2 text-sm text-muted-foreground'>
                    This will remove the selected {deleteTarget.subsectionId !== undefined ? 'subsection' : 'section'}.
                </div>
                <div className='mt-4 flex justify-end gap-2'>
                    <Button type='button' variant='ghost' onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        variant='destructive'
                        disabled={isSaving}
                        onClick={onConfirm}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
