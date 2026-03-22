import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportsTab } from '@/shared/lib/ai-brain/components/ReportsTab';
import { useBrain } from '@/shared/lib/ai-brain/context/BrainContext';

vi.mock('@/shared/lib/ai-brain/context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/components/AssignmentEditor', () => ({
  AssignmentEditor: ({
    assignment,
    onChange,
    readOnly,
  }: {
    assignment: { modelId?: string | null };
    onChange: (next: { modelId?: string | null }) => void;
    readOnly: boolean;
  }) => (
    <div>
      <div>{readOnly ? 'assignment-readonly' : 'assignment-editable'}</div>
      <div>{assignment.modelId ?? 'no-model'}</div>
      <button
        type='button'
        onClick={() => onChange({ ...assignment, modelId: 'override-model' })}
      >
        change assignment
      </button>
    </div>
  ),
}));

vi.mock('@/shared/ui', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Input: ({
    value,
    onChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} {...props} />
  ),
  Textarea: ({
    value,
    onChange,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
  FormSection: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  FormField: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  SimpleSettingsList: ({
    items,
    renderActions,
    renderCustomContent,
  }: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      original: unknown;
    }>;
    renderActions: (item: {
      id: string;
      title: string;
      description: string;
      original: unknown;
    }) => React.ReactNode;
    renderCustomContent: (item: {
      id: string;
      title: string;
      description: string;
      original: unknown;
    }) => React.ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <div>{item.title}</div>
          <div>{item.description}</div>
          {renderActions(item)}
          {renderCustomContent(item)}
        </div>
      ))}
    </div>
  ),
  ToggleRow: ({
    label,
    description,
    checked,
    onCheckedChange,
  }: {
    label: string;
    description?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label>
      <span>{label}</span>
      <input
        type='checkbox'
        aria-label={label}
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      {description ? <span>{description}</span> : null}
    </label>
  ),
  CollapsibleSection: ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'grid',
}));

describe('ReportsTab', () => {
  const setAnalyticsScheduleEnabled = vi.fn();
  const setAnalyticsScheduleMinutes = vi.fn();
  const setRuntimeAnalyticsScheduleEnabled = vi.fn();
  const setRuntimeAnalyticsScheduleMinutes = vi.fn();
  const setLogsScheduleEnabled = vi.fn();
  const setLogsScheduleMinutes = vi.fn();
  const setLogsAutoOnError = vi.fn();
  const setAnalyticsPromptSystem = vi.fn();
  const setRuntimeAnalyticsPromptSystem = vi.fn();
  const setLogsPromptSystem = vi.fn();
  const handleOverrideChange = vi.fn();
  const toggleOverride = vi.fn();

  beforeEach(() => {
    setAnalyticsScheduleEnabled.mockReset();
    setAnalyticsScheduleMinutes.mockReset();
    setRuntimeAnalyticsScheduleEnabled.mockReset();
    setRuntimeAnalyticsScheduleMinutes.mockReset();
    setLogsScheduleEnabled.mockReset();
    setLogsScheduleMinutes.mockReset();
    setLogsAutoOnError.mockReset();
    setAnalyticsPromptSystem.mockReset();
    setRuntimeAnalyticsPromptSystem.mockReset();
    setLogsPromptSystem.mockReset();
    handleOverrideChange.mockReset();
    toggleOverride.mockReset();

    vi.mocked(useBrain).mockReturnValue({
      settings: {
        assignments: {
          analytics: { modelId: 'analytics-model' },
          runtime_analytics: { modelId: 'runtime-model' },
          system_logs: { modelId: 'logs-model' },
          error_logs: { modelId: 'error-model' },
        },
      },
      overridesEnabled: {
        analytics: false,
        runtime_analytics: true,
        system_logs: false,
        error_logs: true,
      },
      effectiveAssignments: {
        analytics: { modelId: 'global-analytics' },
        runtime_analytics: { modelId: 'runtime-model' },
        system_logs: { modelId: 'global-logs' },
        error_logs: { modelId: 'error-model' },
      },
      handleOverrideChange,
      toggleOverride,
      analyticsScheduleEnabled: true,
      setAnalyticsScheduleEnabled,
      analyticsScheduleMinutes: 15,
      setAnalyticsScheduleMinutes,
      runtimeAnalyticsScheduleEnabled: false,
      setRuntimeAnalyticsScheduleEnabled,
      runtimeAnalyticsScheduleMinutes: 30,
      setRuntimeAnalyticsScheduleMinutes,
      logsScheduleEnabled: true,
      setLogsScheduleEnabled,
      logsScheduleMinutes: 60,
      setLogsScheduleMinutes,
      logsAutoOnError: false,
      setLogsAutoOnError,
      analyticsPromptSystem: 'analytics prompt',
      setAnalyticsPromptSystem,
      runtimeAnalyticsPromptSystem: 'runtime prompt',
      setRuntimeAnalyticsPromptSystem,
      logsPromptSystem: 'logs prompt',
      setLogsPromptSystem,
    } as unknown as ReturnType<typeof useBrain>);
  });

  it('renders schedules, prompt steering, and feature overrides and wires interactions through the brain context', () => {
    render(<ReportsTab />);

    expect(screen.getByRole('heading', { name: 'Schedules' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Prompt steering' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Default prompts' })).toBeInTheDocument();
    expect(screen.getByText('Analytics Reports')).toBeInTheDocument();
    expect(screen.getByText('Runtime Analytics Reports')).toBeInTheDocument();
    expect(screen.getAllByText('Using global defaults.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('assignment-readonly').length).toBeGreaterThan(0);
    expect(screen.getAllByText('assignment-editable').length).toBeGreaterThan(0);

    const toggleInputs = screen.getAllByRole('checkbox');
    fireEvent.click(toggleInputs[0] as HTMLInputElement);
    fireEvent.click(toggleInputs[1] as HTMLInputElement);
    fireEvent.click(toggleInputs[2] as HTMLInputElement);
    fireEvent.click(toggleInputs[3] as HTMLInputElement);
    fireEvent.click(toggleInputs[4] as HTMLInputElement);

    expect(setAnalyticsScheduleEnabled).toHaveBeenCalledWith(false);
    expect(setRuntimeAnalyticsScheduleEnabled).toHaveBeenCalledWith(true);
    expect(setLogsScheduleEnabled).toHaveBeenCalledWith(false);
    expect(setLogsAutoOnError).toHaveBeenCalledWith(true);
    expect(toggleOverride).toHaveBeenCalledWith('analytics', true);

    const minuteInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(minuteInputs[0] as HTMLInputElement, { target: { value: '20' } });
    fireEvent.change(minuteInputs[1] as HTMLInputElement, { target: { value: '45' } });
    fireEvent.change(minuteInputs[2] as HTMLInputElement, { target: { value: '90' } });

    expect(setAnalyticsScheduleMinutes).toHaveBeenCalledWith(20);
    expect(setRuntimeAnalyticsScheduleMinutes).toHaveBeenCalledWith(45);
    expect(setLogsScheduleMinutes).toHaveBeenCalledWith(90);

    fireEvent.change(screen.getByLabelText('Analytics prompt'), {
      target: { value: 'new analytics prompt' },
    });
    fireEvent.change(screen.getByLabelText('Runtime analytics prompt'), {
      target: { value: 'new runtime prompt' },
    });
    fireEvent.change(screen.getByLabelText('Logs prompt'), {
      target: { value: 'new logs prompt' },
    });

    expect(setAnalyticsPromptSystem).toHaveBeenCalledWith('new analytics prompt');
    expect(setRuntimeAnalyticsPromptSystem).toHaveBeenCalledWith('new runtime prompt');
    expect(setLogsPromptSystem).toHaveBeenCalledWith('new logs prompt');

    fireEvent.click(screen.getAllByRole('button', { name: 'change assignment' })[0]!);
    expect(handleOverrideChange).toHaveBeenCalledWith('analytics', {
      modelId: 'override-model',
    });
  });
});
