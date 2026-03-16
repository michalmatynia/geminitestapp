'use client';

import React, { useEffect, useState } from 'react';

import { useLessonSvgQuickAddRuntimeContext } from '@/features/kangur/admin/context/LessonSvgQuickAddRuntimeContext';
import { FormModal } from '@/features/kangur/shared/ui';

import { SvgCodeEditor, extractSvgViewBox } from './SvgCodeEditor';

export function LessonSvgQuickAddModal(): React.JSX.Element {
  const { lesson, initialMarkup, isOpen, onClose, onSave, isSaving } =
    useLessonSvgQuickAddRuntimeContext();
  const [markup, setMarkup] = useState(initialMarkup);

  // Reset draft whenever the modal opens for a new (or the same) lesson.
  useEffect(() => {
    if (isOpen) {
      setMarkup(initialMarkup);
    }
  }, [isOpen, initialMarkup]);

  const handleSave = (): void => {
    const viewBox = extractSvgViewBox(markup) ?? '0 0 100 100';
    onSave(markup, viewBox);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={lesson ? `SVG image — ${lesson.title}` : 'SVG image'}
      subtitle='Paste a full SVG to set the primary illustration for this lesson. The image is placed in the first SVG block of the lesson document.'
      onSave={handleSave}
      isSaving={isSaving}
      isSaveDisabled={!markup.trim() || isSaving}
      saveText='Save SVG'
      size='xl'
    >
      <SvgCodeEditor
        value={markup}
        onChange={setMarkup}
        previewSize='full'
        placeholder='<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg">\n  <!-- Paste your full SVG here -->\n</svg>'
      />
    </FormModal>
  );
}
