/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLessonContentEditorContext } from '../../context/LessonContentEditorContext';

vi.mock('../../KangurLessonDocumentEditor', () => ({
  KangurLessonDocumentEditor: () => {
    const { onChange } = useLessonContentEditorContext();
    return (
      <div>
        <div data-testid='lesson-document-editor' />
        <button
          type='button'
          onClick={(): void =>
            onChange({
              version: 1,
              blocks: [
                {
                  id: 'text-2',
                  type: 'text',
                  html: '<p>Updated</p>',
                  align: 'left',
                },
              ],
            })
          }
        >
          Change draft
        </button>
      </div>
    );
  },
}));

vi.mock('../../KangurLessonNarrationPanel', () => ({
  KangurLessonNarrationPanel: () => <div data-testid='lesson-narration-panel' />,
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: ({
    isOpen,
    title,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid='discard-confirm'>
        <div>{title}</div>
        <button type='button' onClick={onConfirm}>
          Confirm discard
        </button>
        <button type='button' onClick={onClose}>
          Keep editing
        </button>
      </div>
    ) : null,
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

function TestDialog({
  onClose = vi.fn(),
  onSave = vi.fn(),
  onImportLegacy = vi.fn(),
  onClearContent = vi.fn(),
}: {
  onClose?: () => void;
  onSave?: () => void;
  onImportLegacy?: () => void;
  onClearContent?: () => void;
}): React.JSX.Element {
  const [lessonState, setLessonState] = React.useState(lesson);
  const [documentState, setDocumentState] = React.useState(documentValue);

  return (
    <LessonContentEditorDialog
      lesson={lessonState}
      document={documentState}
      isOpen={true}
      isSaving={false}
      onClose={onClose}
      onLessonChange={setLessonState}
      onChange={setDocumentState}
      onSave={onSave}
      onImportLegacy={onImportLegacy}
      onClearContent={onClearContent}
    />
  );
}

describe('LessonContentEditorDialog', () => {
  it('renders content actions and delegates toolbar callbacks', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();
    const handleImportLegacy = vi.fn();
    const handleClearContent = vi.fn();

    render(
      <TestDialog
        onClose={handleClose}
        onSave={handleSave}
        onImportLegacy={handleImportLegacy}
        onClearContent={handleClearContent}
      />
    );

    expect(screen.getByTestId('lesson-document-editor')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-narration-panel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lesson One')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Intro lesson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save content/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /import legacy/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear content/i }));
    fireEvent.click(screen.getByRole('button', { name: /close editor/i }));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Lesson One Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save content/i }));

    expect(handleImportLegacy).toHaveBeenCalledTimes(1);
    expect(handleClearContent).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before closing a dirty draft', () => {
    const handleClose = vi.fn();

    render(<TestDialog onClose={handleClose} />);

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Lesson One Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: /close editor/i }));

    expect(handleClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm discard'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('blocks saving when the lesson title is empty', () => {
    render(<TestDialog />);

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '' },
    });

    expect(screen.getByText('Lesson title is required before saving.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save content/i })).toBeDisabled();
  });
});
