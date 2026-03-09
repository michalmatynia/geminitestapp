/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  TreeRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { TestSuiteTreeRow } from './TestSuiteTreeRow';
import { toKangurTestSuiteNodeId } from '../kangur-test-suites-master-tree';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

const suite: KangurTestSuite = {
  id: 'suite-1',
  title: 'Test Suite',
  description: 'Suite description',
  year: 2026,
  gradeLevel: 'III-IV',
  category: 'math',
  enabled: true,
  sortOrder: 1000,
};

describe('TestSuiteTreeRow', () => {
  it('renders suite health badges for suite nodes', () => {
    const onReviewQueue = vi.fn();

    render(
      <TestSuiteTreeRow
        input={{
          node: {
            id: toKangurTestSuiteNodeId(suite.id),
            name: suite.title,
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
        suiteById={new Map([[suite.id, suite]])}
        questionCountBySuiteId={new Map([[suite.id, 6]])}
        suiteHealthById={
          new Map([
            [
              suite.id,
              {
                questionCount: 6,
                readyQuestionCount: 2,
                needsReviewQuestionCount: 3,
                needsFixQuestionCount: 1,
                richQuestionCount: 4,
                status: 'needs-fix',
              },
            ],
          ])
        }
        onEdit={vi.fn()}
        onManageQuestions={vi.fn()}
        onReviewQueue={onReviewQueue}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Test Suite')).toBeInTheDocument();
    expect(screen.getByText('6Q')).toBeInTheDocument();
    expect(screen.getByText('Fix 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open review queue' })).toBeInTheDocument();
  });
});
