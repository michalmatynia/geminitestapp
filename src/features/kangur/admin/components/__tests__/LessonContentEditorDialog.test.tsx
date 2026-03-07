/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../KangurLessonDocumentEditor', () => ({
  KangurLessonDocumentEditor: () => <div data-testid='lesson-document-editor' />,
}));

vi.mock('../../KangurLessonNarrationPanel', () => ({
  KangurLessonNarrationPanel: () => <div data-testid='lesson-narration-panel' />,
}));

import { LessonContentEditorDialog } from '../LessonContentEditorDialog';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';

const lesson: KangurLesson = {
  id: 'lesson-1',
  slug: 'lesson-one',
  title: 'Lesson One',
  description: 'Intro lesson',
  emoji: '*',
  color: '#ffffff',
  category: 'geometry',
  sortOrder: 1,
  enabled: true,
};

const documentValue: KangurLessonDocument = {
  version: 1,
  blocks: [
    {
      id: 'text-1',
      type: 'text',
      html: '<p>Hello</p>',
      align: 'left',
    },
  ],
};

describe('LessonContentEditorDialog', () => {
  it('renders content actions and delegates toolbar callbacks', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();
    const handleImportLegacy = vi.fn();
    const handleClearContent = vi.fn();

    render(
      <LessonContentEditorDialog
        lesson={lesson}
        document={documentValue}
        isOpen={true}
        isSaving={false}
        onClose={handleClose}
        onChange={vi.fn()}
        onSave={handleSave}
        onImportLegacy={handleImportLegacy}
        onClearContent={handleClearContent}
      />
    );

    expect(screen.getByTestId('lesson-document-editor')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-narration-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /import legacy/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear content/i }));
    fireEvent.click(screen.getByRole('button', { name: /save content/i }));
    fireEvent.click(screen.getByRole('button', { name: /close editor/i }));

    expect(handleImportLegacy).toHaveBeenCalledTimes(1);
    expect(handleClearContent).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
