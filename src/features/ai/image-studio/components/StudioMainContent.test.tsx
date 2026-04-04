// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isFocusMode: false,
  projectId: '',
  projectsQuery: {
    data: [] as Array<Record<string, unknown>>,
    isLoading: false,
  },
  slotsQuery: {
    isLoading: false,
  },
}));

vi.mock('./CenterPreview', () => ({
  CenterPreview: () => <div data-testid='center-preview'>Center Preview</div>,
}));

vi.mock('./LeftSidebar', () => ({
  LeftSidebar: () => <div data-testid='left-sidebar'>Left Sidebar</div>,
}));

vi.mock('./RightSidebar', () => ({
  RightSidebar: () => <div data-testid='right-sidebar'>Right Sidebar</div>,
}));

vi.mock('./ImageStudioPageSkeleton', () => ({
  ImageStudioPageSkeleton: () => <div data-testid='page-skeleton'>Page Skeleton</div>,
}));

vi.mock('../context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: mocks.projectId,
    projectsQuery: mocks.projectsQuery,
  }),
}));

vi.mock('../context/SlotsContext', () => ({
  useSlotsState: () => ({
    slotsQuery: mocks.slotsQuery,
  }),
}));

vi.mock('../context/UiContext', () => ({
  useUiLayoutState: () => ({
    isFocusMode: mocks.isFocusMode,
  }),
}));

import { StudioMainContent } from './StudioMainContent';

describe('StudioMainContent', () => {
  beforeEach(() => {
    mocks.isFocusMode = false;
    mocks.projectId = '';
    mocks.projectsQuery = {
      data: [],
      isLoading: false,
    };
    mocks.slotsQuery = {
      isLoading: false,
    };
  });

  it('shows the page skeleton while projects are bootstrapping', () => {
    mocks.projectsQuery = {
      data: [],
      isLoading: true,
    };

    render(<StudioMainContent />);

    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
  });

  it('keeps the workspace shell visible while slots are still loading', async () => {
    mocks.projectId = 'project-1';
    mocks.projectsQuery = {
      data: [{ id: 'project-1' }],
      isLoading: false,
    };
    mocks.slotsQuery = {
      isLoading: true,
    };

    const { container } = render(<StudioMainContent />);

    expect(screen.queryByTestId('page-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('center-preview')).toBeInTheDocument();
    expect(await screen.findByTestId('right-sidebar')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('data-studio-shell-loading', 'true');
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
  });
});
