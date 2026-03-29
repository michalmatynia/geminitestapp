/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import type { useSocialPostContext as useSocialPostContextType } from './SocialPostContext';

const socialPostPipelineTestHarness = vi.hoisted(() => ({
  useSocialPostContextMock: vi.fn(),
}));

type SocialPostContextValue = ReturnType<typeof useSocialPostContextType>;

vi.mock('@/features/kangur/shared/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  Card: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...rest}>{children}</div>
  ),
  FormSection: ({
    title,
    description,
    actions,
    children,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </section>
  ),
  LoadingState: ({ message }: { message?: string }) => (
    <div role='status'>{message ?? 'Loading...'}</div>
  ),
}));

vi.mock('./SocialPostContext', () => ({
  useSocialPostContext: () =>
    socialPostPipelineTestHarness.useSocialPostContextMock() as SocialPostContextValue,
}));

export const resetSocialPostPipelineTestHarness = (): void => {
  socialPostPipelineTestHarness.useSocialPostContextMock.mockReset();
};

export const cleanupSocialPostPipelineTestHarness = (): void => {
  cleanup();
  vi.clearAllMocks();
};

export const mockSocialPostContextReturnValue = <T,>(value: T): void => {
  socialPostPipelineTestHarness.useSocialPostContextMock.mockReturnValue(value);
};
