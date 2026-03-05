import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

import {
  PersistenceProvider,
  usePersistenceActions,
  usePersistenceState,
} from '../PersistenceContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <PersistenceProvider initialLoading={false}>{children}</PersistenceProvider>
);

describe('PersistenceContext savePathConfig guard', () => {
  beforeEach(() => {
    logClientErrorMock.mockReset();
  });

  it('fails loudly when save handler is missing', async () => {
    const { result } = renderHook(
      () => ({ ...usePersistenceState(), ...usePersistenceActions() }),
      { wrapper }
    );

    let saveResult = true;
    await act(async () => {
      saveResult = await result.current.savePathConfig({ force: true });
    });

    expect(saveResult).toBe(false);
    await waitFor(() => {
      expect(result.current.autoSaveStatus).toBe('error');
    });
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'ai-paths.persistence-context',
          action: 'savePathConfig',
        }),
      })
    );
  });

  it('delegates to registered save handler', async () => {
    const { result } = renderHook(
      () => ({ ...usePersistenceState(), ...usePersistenceActions() }),
      { wrapper }
    );
    const saveHandler = vi.fn(async () => true);

    act(() => {
      result.current.setOperationHandlers({ savePathConfig: saveHandler });
    });

    let saveResult = false;
    await act(async () => {
      saveResult = await result.current.savePathConfig({ includeNodeConfig: true, force: true });
    });

    expect(saveResult).toBe(true);
    expect(saveHandler).toHaveBeenCalledTimes(1);
    expect(saveHandler).toHaveBeenCalledWith({ includeNodeConfig: true, force: true });
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });
});
