// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DatabaseEngineProvider,
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from './DatabaseEngineContext';

const mocks = vi.hoisted(() => ({
  useDatabaseEngineState: vi.fn(),
}));

vi.mock('../hooks/useDatabaseEngineState', () => ({
  useDatabaseEngineState: () => mocks.useDatabaseEngineState(),
}));

describe('DatabaseEngineContext', () => {
  beforeEach(() => {
    mocks.useDatabaseEngineState.mockReturnValue({
      activeView: 'overview',
      refetchAll: vi.fn(),
      saveSettings: vi.fn(),
      serviceRoutes: [],
      setActiveView: vi.fn(),
      syncMongoSources: vi.fn(),
      updateBackupSchedule: vi.fn(),
      updateCollectionRoute: vi.fn(),
      updateOperationControls: vi.fn(),
      updatePolicy: vi.fn(),
      updateServiceRoute: vi.fn(),
    });
  });

  it('throws when strict hooks are used outside the provider', () => {
    expect(() => renderHook(() => useDatabaseEngineStateContext())).toThrow(
      'useDatabaseEngineStateContext must be used within a DatabaseEngineProvider'
    );
    expect(() => renderHook(() => useDatabaseEngineActionsContext())).toThrow(
      'useDatabaseEngineActionsContext must be used within a DatabaseEngineProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DatabaseEngineProvider>{children}</DatabaseEngineProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useDatabaseEngineActionsContext(),
        state: useDatabaseEngineStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      activeView: 'overview',
      serviceRoutes: [],
    });
    expect(result.current.actions.setActiveView).toBeTypeOf('function');
    expect(result.current.actions.saveSettings).toBeTypeOf('function');
    expect(result.current.actions.refetchAll).toBeTypeOf('function');
  });
});
