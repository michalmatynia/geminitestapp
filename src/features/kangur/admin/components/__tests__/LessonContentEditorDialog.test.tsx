/**
 * @vitest-environment jsdom
 */


"use client";

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/features/kangur/shared/ui/templates/modals', () => ({
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
import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';
import { buildKangurLessonDocumentNarrationSignature } from '@/features/kangur/tts/script';

const lesson: KangurLesson = {
  id: 'lesson-1',
  componentId: 'geometry_basics',
  contentMode: 'document',
  subject: 'maths',
  title: 'Lesson One',
  description: 'Intro lesson',
  emoji: '*',
  color: '#ffffff',
  activeBg: 'bg-sky-500',
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
  beforeEach(() => {
    window.localStorage.clear();
  });

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
    expect(screen.getByText('Next recommended action: This draft is ready for a final preview and save.')).toBeInTheDocument();
    expect(screen.getAllByText('Lesson setup').length).toBeGreaterThan(0);
    expect(screen.getByText('Learner content')).toBeInTheDocument();
    expect(screen.getByText('Narration')).toBeInTheDocument();
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
    expect(screen.getByText('Next recommended action: Finish the lesson title in Lesson setup.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save content/i })).toBeDisabled();
  });

  it('offers local draft recovery when a newer autosaved draft exists', async () => {
    window.localStorage.setItem(
      'kangur-lesson-editor-draft:v1:lesson-1',
      JSON.stringify({
        version: 1,
        savedAt: '2026-03-09T12:30:00.000Z',
        lesson: {
          ...lesson,
          title: 'Recovered draft title',
        },
        document: {
          ...documentValue,
          blocks: [
            {
              id: 'text-2',
              type: 'text',
              html: '<p>Recovered content</p>',
              align: 'left',
            },
          ],
        },
      })
    );

    render(<TestDialog />);

    expect(screen.getByText('Recovered local draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restore draft/i }));

    await waitFor(() =>
      expect(screen.getByDisplayValue('Recovered draft title')).toBeInTheDocument()
    );
  });

  it('shows publish blockers when narration preview is stale', () => {
    const signature = buildKangurLessonDocumentNarrationSignature({
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      document: {
        ...documentValue,
        narration: {
          voice: 'coral',
          locale: 'pl-PL',
        },
      },
      voice: 'coral',
      locale: 'pl-PL',
    });

    function StaleNarrationDialog(): React.JSX.Element {
      const [lessonState, setLessonState] = React.useState(lesson);
      const [documentState, setDocumentState] = React.useState<KangurLessonDocument>({
        ...documentValue,
        narration: {
          voice: 'coral',
          locale: 'pl-PL',
          previewSourceSignature: `${signature}-stale`,
          lastPreviewedAt: '2026-03-09T12:00:00.000Z',
        },
      });

      return (
        <LessonContentEditorDialog
          lesson={lessonState}
          document={documentState}
          isOpen={true}
          isSaving={false}
          onClose={vi.fn()}
          onLessonChange={setLessonState}
          onChange={setDocumentState}
          onSave={vi.fn()}
          onImportLegacy={vi.fn()}
          onClearContent={vi.fn()}
        />
      );
    }

    render(<StaleNarrationDialog />);

    expect(screen.getByText('Publish blockers')).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes('Refresh narration preview before publishing this lesson.')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Next recommended action: Refresh narration preview so it matches the latest content edits.')
    ).toBeInTheDocument();
  });
});
