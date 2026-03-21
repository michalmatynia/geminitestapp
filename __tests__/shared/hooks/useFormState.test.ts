import { renderHook, act, waitFor } from '@/__tests__/test-utils';
import { describe, it, expect, vi } from 'vitest';

import { useFormState } from '@/shared/hooks/useFormState';

describe('useFormState', () => {
  interface TestFormData {
    [key: string]: unknown;
    name: string;
    email: string;
  }

  const initialValues: TestFormData = { name: '', email: '' };

  it('initializes with initial values', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.state.values).toEqual(initialValues);
    expect(result.current.state.errors).toEqual({});
  });

  it('updates field value', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.setValue('name', 'John');
    });

    expect(result.current.state.values.name).toBe('John');
  });

  it('tracks dirty state', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.state.isDirty).toBe(false);

    act(() => {
      result.current.actions.setValue('name', 'John');
    });

    expect(result.current.state.isDirty).toBe(true);
  });

  it('validates form on submit', async () => {
    const validate = vi.fn().mockResolvedValue({ name: 'Name is required' });
    const onSubmit = vi.fn();

    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        validate,
        onSubmit,
      })
    );

    await act(async () => {
      await result.current.actions.handleSubmit();
    });

    expect(validate).toHaveBeenCalledWith(initialValues);
    expect(result.current.state.errors['name']).toBe('Name is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit on successful validation', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const testValues = { name: 'John', email: 'john@example.com' };

    const { result } = renderHook(() =>
      useFormState({
        initialValues: testValues,
        validate: vi.fn().mockResolvedValue({}),
        onSubmit,
      })
    );

    await act(async () => {
      await result.current.actions.handleSubmit();
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(testValues);
    });
  });

  it('sets field error', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.setFieldError('name', 'Error message');
    });

    expect(result.current.state.errors['name']).toBe('Error message');
  });

  it('clears field error', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.setFieldError('name', 'Error message');
    });

    expect(result.current.state.errors['name']).toBe('Error message');

    act(() => {
      result.current.actions.clearFieldError('name');
    });

    expect(result.current.state.errors['name']).toBeUndefined();
  });

  it('resets form to initial values', () => {
    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.actions.setValue('name', 'John');
      result.current.actions.setFieldError('email', 'Invalid');
    });

    act(() => {
      result.current.actions.reset();
    });

    expect(result.current.state.values).toEqual(initialValues);
    expect(result.current.state.errors).toEqual({});
  });

  it('calls onSubmitSuccess callback', async () => {
    const onSubmitSuccess = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit,
        onSubmitSuccess,
      })
    );

    await act(async () => {
      await result.current.actions.handleSubmit();
    });

    expect(onSubmitSuccess).toHaveBeenCalled();
  });

  it('calls onSubmitError callback on error', async () => {
    const error = new Error('Submit failed');
    const onSubmitError = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useFormState({
        initialValues,
        onSubmit,
        onSubmitError,
      })
    );

    await act(async () => {
      await result.current.actions.handleSubmit();
    });

    expect(onSubmitError).toHaveBeenCalledWith(error);
  });
});
