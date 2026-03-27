/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AgentPersona } from '@/shared/contracts/agents';

const { useBrainAssignmentMock } = vi.hoisted(() => ({
  useBrainAssignmentMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: useBrainAssignmentMock,
}));

vi.mock('@/features/ai/agentcreator/components/AgentPersonaMoodEditor', () => ({
  AgentPersonaMoodEditor: () => <div data-testid='agent-persona-mood-editor' />,
}));

vi.mock('@/shared/ui', () => ({
  __esModule: true,
  UI_GRID_RELAXED_CLASSNAME: 'ui-grid-relaxed',
  Button: ({
    asChild,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    children: React.ReactNode;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }
    return <button {...props}>{children}</button>;
  },
  FormField: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <label className='block'>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormSection: ({
    title,
    children,
    actions,
  }: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {actions}
      {children}
    </section>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  ToggleRow: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        type='checkbox'
        aria-label={label}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  ),
}));

import { AgentPersonaSettingsForm } from './AgentPersonaSettingsForm';

describe('AgentPersonaSettingsForm', () => {
  it('preserves sibling persona settings when a memory control changes', () => {
    useBrainAssignmentMock.mockReturnValue({ effectiveModelId: '' });
    const onChange = vi.fn();
    const item: Partial<AgentPersona> = {
      id: 'persona-1',
      settings: {
        customInstructions: 'Stay concise',
        memory: {
          enabled: false,
          defaultSearchLimit: 9,
        },
      },
    };

    render(<AgentPersonaSettingsForm item={item} originalItem={item} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/default search limit/i), {
      target: { value: '12' },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      settings: {
        customInstructions: 'Stay concise',
        memory: {
          enabled: false,
          includeChatHistory: true,
          useMoodSignals: true,
          defaultSearchLimit: 12,
        },
      },
    });

    fireEvent.click(screen.getByLabelText(/include chat history/i));

    expect(onChange).toHaveBeenLastCalledWith({
      settings: {
        customInstructions: 'Stay concise',
        memory: {
          enabled: false,
          includeChatHistory: false,
          useMoodSignals: true,
          defaultSearchLimit: 9,
        },
      },
    });
  });
});
