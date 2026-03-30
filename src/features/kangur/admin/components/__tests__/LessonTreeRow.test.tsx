/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  TreeRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { LessonTreeRow } from '../LessonTreeRow';
import { toKangurLessonNodeId } from '../../kangur-lessons-master-tree';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

const lesson: KangurLesson = {
  id: 'lesson-1',
  componentId: 'clock',
  contentMode: 'document',
  subject: 'maths',
  ageGroup: 'ten_year_old',
  title: 'Lesson One',
  description: 'Intro lesson',
  emoji: '🕐',
  color: '#fff',
  activeBg: 'bg-indigo-500',
  sortOrder: 1000,
  enabled: false,
};

describe('LessonTreeRow', () => {
  it('renders authoring health badges for lesson nodes', () => {
    render(
      <LessonTreeRow
        input={{
          node: {
            id: toKangurLessonNodeId(lesson.id),
            name: lesson.title,
            metadata: {},
          },
          depth: 0,
          isSelected: false,
          isExpanded: false,
          isDragging: false,
          isSearchMatch: false,
          hasChildren: false,
          select: vi.fn(),
          toggleExpand: vi.fn(),
        } as any}
        lessonById={new Map([[lesson.id, lesson]])}
        authoringStatus={() => ({
          hasContent: true,
          needsLegacyImport: false,
          isHidden: true,
          isMissingNarration: true,
          hasStructuralWarnings: true,
          hasBlockingIssues: false,
        })}
        onEdit={vi.fn()}
        onEditContent={vi.fn()}
        onQuickSvg={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(screen.getByText('Needs fixes')).toBeInTheDocument();
    expect(screen.getByText('Missing narration')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByText('Lesson One')).toBeInTheDocument();
  });
});
