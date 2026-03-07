'use client';

import React, { useEffect, useState } from 'react';

import type { KangurLesson } from '@/shared/contracts/kangur';
import { FormModal } from '@/shared/ui';

import { SvgCodeEditor, extractSvgViewBox } from './SvgCodeEditor';

type Props = {
  lesson: KangurLesson | null;
  /** Pre-filled SVG markup from the existing first SVG block (empty string if none). */
  initialMarkup: string;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called with the current markup and the auto-detected (or default) viewBox.
   * The parent is responsible for persisting the change.
   */
  onSave: (markup: string, viewBox: string) => void;
  isSaving: boolean;
};

export function LessonSvgQuickAddModal({
  lesson,
  initialMarkup,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: Props): React.JSX.Element {
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
