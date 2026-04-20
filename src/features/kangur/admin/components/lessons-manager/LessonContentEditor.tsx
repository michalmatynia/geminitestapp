import React from 'react';
import { FormModal } from '@/shared/ui/forms-and-actions.public';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

interface LessonContentEditorProps {
  lesson: KangurLesson | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  isSaving: boolean;
}

export function LessonContentEditor({
  lesson,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: LessonContentEditorProps): React.JSX.Element {
  const [content, setContent] = React.useState('');

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={`Edit content: ${lesson?.name ?? 'Lesson'}`}
      onSave={() => onSave(content)}
      isSaving={isSaving}
      saveText='Save Changes'
      size='lg'
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className='w-full min-h-[300px] p-2 border rounded'
        aria-label='Content editor'
      />
    </FormModal>
  );
}
