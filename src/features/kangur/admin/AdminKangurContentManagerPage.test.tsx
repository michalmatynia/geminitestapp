/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lessonsPageMock, testsPageMock } = vi.hoisted(() => ({
  lessonsPageMock: vi.fn(),
  testsPageMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('./AdminKangurLessonsManagerPage', () => ({
  AdminKangurLessonsManagerPage: (props: { standalone?: boolean }) => {
    lessonsPageMock(props);
    return <div>Lessons manager body</div>;
  },
}));

vi.mock('./AdminKangurTestSuitesManagerPage', () => ({
  AdminKangurTestSuitesManagerPage: (props: { standalone?: boolean }) => {
    testsPageMock(props);
    return <div>Tests manager body</div>;
  },
}));

import { AdminKangurContentManagerPage } from './AdminKangurContentManagerPage';

describe('AdminKangurContentManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders Kangur admin shell chrome and defaults to lessons tab', () => {
    render(<AdminKangurContentManagerPage />);

    expect(screen.getByText('Kangur Content Manager')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Content Manager'
    );
    expect(screen.getByText('Lessons manager body')).toBeInTheDocument();
    expect(lessonsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(testsPageMock).not.toHaveBeenCalled();
  });

  it('switches tabs and persists the selected content-manager view', () => {
    render(<AdminKangurContentManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: /tests/i }));

    expect(screen.getByText('Tests manager body')).toBeInTheDocument();
    expect(testsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(window.localStorage.getItem('kangur_content_manager_tab_v1')).toBe('tests');
  });

  it('restores the persisted tests tab on first render', () => {
    window.localStorage.setItem('kangur_content_manager_tab_v1', 'tests');

    render(<AdminKangurContentManagerPage />);

    expect(screen.getByText('Tests manager body')).toBeInTheDocument();
    expect(testsPageMock).toHaveBeenCalledWith({ standalone: false });
    expect(lessonsPageMock).not.toHaveBeenCalled();
  });
});
