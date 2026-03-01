import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  GenericApiConsole,
  type ApiPreset,
} from '@/shared/ui/templates/GenericApiConsole';

describe('GenericApiConsole', () => {
  const mockPresets: ApiPreset[] = [
    { label: 'Test 1', method: 'GET', path: '/test' },
    { label: 'Test 2', method: 'POST', body: '{"test": true}' },
  ];

  const mockState = {
    method: 'GET',
    path: '/api/test',
    bodyOrParams: '{}',
    loading: false,
    error: null,
    response: null,
  };

  const createProps = (overrides = {}) => ({
    config: {
      title: 'Test API Console',
      description: 'Test Description',
      baseUrl: 'https://api.example.com',
      methodType: 'select' as const,
      bodyOrParamsLabel: 'Parameters',
    },
    state: mockState,
    presets: mockPresets,
    onSetMethod: vi.fn(),
    onSetPath: vi.fn(),
    onSetBodyOrParams: vi.fn(),
    onRequest: vi.fn(),
    ...overrides,
  });

  it('renders with title and description', () => {
    const props = createProps();
    render(<GenericApiConsole {...props} />);

    expect(screen.getByText('Test API Console')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    const props = createProps();
    render(<GenericApiConsole {...props} />);

    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('Test 2')).toBeInTheDocument();
  });

  it('calls onSetMethod when preset is clicked', () => {
    const onSetMethod = vi.fn();
    const onSetBodyOrParams = vi.fn();
    const props = createProps({ onSetMethod, onSetBodyOrParams });

    render(<GenericApiConsole {...props} />);

    fireEvent.click(screen.getByText('Test 1'));

    expect(onSetMethod).toHaveBeenCalledWith('GET');
  });

  it('shows connection warning when not connected', () => {
    const props = createProps({
      config: {
        ...createProps().config,
        connectionWarning: 'Not connected',
      },
      isConnected: false,
    });

    render(<GenericApiConsole {...props} />);

    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('calls onRequest when send button is clicked', () => {
    const onRequest = vi.fn();
    const props = createProps({ onRequest });

    render(<GenericApiConsole {...props} />);

    fireEvent.click(screen.getByText('Send request'));

    expect(onRequest).toHaveBeenCalled();
  });

  it('disables send button when loading', () => {
    const props = createProps({
      state: { ...mockState, loading: true },
    });

    render(<GenericApiConsole {...props} />);

    const button = screen.getByText('Sending...');
    expect(button).toBeDisabled();
  });

  it('disables send button when not connected', () => {
    const props = createProps({ isConnected: false });

    render(<GenericApiConsole {...props} />);

    const button = screen.getByText('Send request');
    expect(button).toBeDisabled();
  });

  it('displays error alert when error exists', () => {
    const props = createProps({
      state: { ...mockState, error: 'Test error message' },
    });

    render(<GenericApiConsole {...props} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('displays response when available', () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      data: { test: 'data' },
      refreshed: false,
    };

    const props = createProps({
      state: { ...mockState, response: mockResponse },
    });

    render(<GenericApiConsole {...props} />);

    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/OK/)).toBeInTheDocument();
  });

  it('shows token refreshed badge when refreshed', () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      data: { test: 'data' },
      refreshed: true,
    };

    const props = createProps({
      state: { ...mockState, response: mockResponse },
    });

    render(<GenericApiConsole {...props} />);

    expect(screen.getByText('Token refreshed')).toBeInTheDocument();
  });

  it('renders path input when onSetPath provided', () => {
    const props = createProps();

    render(<GenericApiConsole {...props} />);

    // Should show path input when onSetPath is provided
    const pathInputs = screen.getAllByDisplayValue('/api/test');
    expect(pathInputs.length).toBeGreaterThan(0);
  });

  it('renders base URL in footer', () => {
    const props = createProps();

    render(<GenericApiConsole {...props} />);

    expect(screen.getByText(/https:\/\/api.example.com/)).toBeInTheDocument();
  });
});
