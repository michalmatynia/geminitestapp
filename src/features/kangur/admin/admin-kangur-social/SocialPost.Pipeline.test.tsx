/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
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
}));

import { SocialPostPipeline } from './SocialPost.Pipeline';

describe('SocialPostPipeline', () => {
  it('disables the pipeline when AI Brain post generation is not configured', () => {
    const handleRunFullPipeline = vi.fn();

    render(
      <SocialPostPipeline
        activePostId='post-1'
        pipelineStep='idle'
        handleRunFullPipeline={handleRunFullPipeline}
        canRunPipeline={false}
        pipelineBlockedReason='Assign an AI Brain model for StudiQ Social Post Generation in /admin/brain?tab=routing.'
      />
    );

    const button = screen.getByRole('button', { name: 'Run full pipeline' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(
        'Assign an AI Brain model for StudiQ Social Post Generation in /admin/brain?tab=routing.'
      )
    ).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleRunFullPipeline).not.toHaveBeenCalled();
  });
});
