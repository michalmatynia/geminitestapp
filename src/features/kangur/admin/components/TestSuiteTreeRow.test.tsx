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
  publicationStatus: 'draft',
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
                draftQuestionCount: 2,
                readyToPublishQuestionCount: 1,
                publishableQuestionCount: 1,
                publishedQuestionCount: 3,
                publishStatus: 'partial',
                publicationStatus: 'draft',
                isLive: false,
                canGoLive: false,
                liveNeedsAttention: false,
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
    expect(screen.getByText('Draft 2')).toBeInTheDocument();
    expect(screen.getByText('Published 3/6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish ready questions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open review queue' })).toBeInTheDocument();
  });

  it('shows the take-offline action for live suites', () => {
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
        suiteById={new Map([[suite.id, { ...suite, publicationStatus: 'live' }]])}
        questionCountBySuiteId={new Map([[suite.id, 2]])}
        suiteHealthById={
          new Map([
            [
              suite.id,
              {
                questionCount: 2,
                readyQuestionCount: 2,
                needsReviewQuestionCount: 0,
                needsFixQuestionCount: 0,
                richQuestionCount: 0,
                draftQuestionCount: 0,
                readyToPublishQuestionCount: 0,
                publishableQuestionCount: 0,
                publishedQuestionCount: 2,
                publishStatus: 'published',
                publicationStatus: 'live',
                isLive: true,
                canGoLive: false,
                liveNeedsAttention: false,
                status: 'ready',
              },
            ],
          ])
        }
        onEdit={vi.fn()}
        onManageQuestions={vi.fn()}
        onTakeOffline={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take suite offline' })).toBeInTheDocument();
  });

  it('flags unstable live suites that need attention', () => {
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
        suiteById={new Map([[suite.id, { ...suite, publicationStatus: 'live' }]])}
        questionCountBySuiteId={new Map([[suite.id, 2]])}
        suiteHealthById={
          new Map([
            [
              suite.id,
              {
                questionCount: 2,
                readyQuestionCount: 1,
                needsReviewQuestionCount: 0,
                needsFixQuestionCount: 0,
                richQuestionCount: 0,
                draftQuestionCount: 1,
                readyToPublishQuestionCount: 0,
                publishableQuestionCount: 0,
                publishedQuestionCount: 1,
                publishStatus: 'partial',
                publicationStatus: 'live',
                isLive: true,
                canGoLive: false,
                liveNeedsAttention: true,
                status: 'ready',
              },
            ],
          ])
        }
        onEdit={vi.fn()}
        onManageQuestions={vi.fn()}
        onTakeOffline={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Live needs attention')).toBeInTheDocument();
  });
});
