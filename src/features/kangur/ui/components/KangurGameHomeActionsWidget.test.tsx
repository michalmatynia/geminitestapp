/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

import { KangurGameHomeActionsWidget } from './KangurGameHomeActionsWidget';

describe('KangurGameHomeActionsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the observability action on the Kangur admin home surface', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/admin/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.getByRole('link', { name: /obserwowalność/i })).toHaveAttribute(
      'href',
      '/admin/kangur/observability'
    );
  });

  it('keeps the observability action off the learner-facing home surface', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canStartFromHome: true,
      handleStartGame: vi.fn(),
      screen: 'home',
      setScreen: vi.fn(),
    });

    render(<KangurGameHomeActionsWidget />);

    expect(screen.queryByRole('link', { name: /obserwowalność/i })).not.toBeInTheDocument();
  });
});
