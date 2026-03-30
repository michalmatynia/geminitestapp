/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurSerializedSnapshotSync } from '../useKangurSerializedSnapshotSync';

function SnapshotSyncHarness({
  clearSpy,
  initialSerializedSnapshot = null,
  onSerializedSnapshotChange,
  restoreResult = true,
  restoreSpy,
}: {
  clearSpy: ReturnType<typeof vi.fn>;
  initialSerializedSnapshot?: string | null;
  onSerializedSnapshotChange?: (raw: string | null) => void;
  restoreResult?: boolean;
  restoreSpy: ReturnType<typeof vi.fn>;
}): React.JSX.Element {
  const [serializedSnapshot, setSerializedSnapshot] = useState<string | null>(null);

  const clearSnapshot = useCallback(() => {
    clearSpy();
    setSerializedSnapshot(null);
  }, [clearSpy]);

  const restoreSerializedSnapshot = useCallback(
    (raw: string): boolean => {
      restoreSpy(raw);
      if (restoreResult) {
        setSerializedSnapshot(raw);
      }
      return restoreResult;
    },
    [restoreResult, restoreSpy]
  );

  useKangurSerializedSnapshotSync({
    clearSnapshot,
    initialSerializedSnapshot,
    onSerializedSnapshotChange,
    restoreSerializedSnapshot,
    serializedSnapshot,
  });

  return (
    <>
      <button type='button' onClick={() => setSerializedSnapshot('local-draft')}>
        Set local draft
      </button>
      <div data-testid='serialized-snapshot'>{serializedSnapshot ?? ''}</div>
    </>
  );
}

describe('useKangurSerializedSnapshotSync', () => {
  it('restores an incoming snapshot once and emits it after hydration completes', async () => {
    const clearSpy = vi.fn();
    const onSerializedSnapshotChange = vi.fn();
    const restoreSpy = vi.fn();
    const { rerender } = render(
      <SnapshotSyncHarness
        clearSpy={clearSpy}
        initialSerializedSnapshot='restored-draft'
        onSerializedSnapshotChange={onSerializedSnapshotChange}
        restoreSpy={restoreSpy}
      />
    );

    await waitFor(() => {
      expect(restoreSpy).toHaveBeenCalledWith('restored-draft');
    });
    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith('restored-draft');
    });
    expect(clearSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('serialized-snapshot')).toHaveTextContent(
      'restored-draft'
    );

    rerender(
      <SnapshotSyncHarness
        clearSpy={clearSpy}
        initialSerializedSnapshot='restored-draft'
        onSerializedSnapshotChange={onSerializedSnapshotChange}
        restoreSpy={restoreSpy}
      />
    );

    expect(restoreSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the current snapshot when the incoming draft is removed', async () => {
    const clearSpy = vi.fn();
    const onSerializedSnapshotChange = vi.fn();
    const restoreSpy = vi.fn();
    const { rerender } = render(
      <SnapshotSyncHarness
        clearSpy={clearSpy}
        initialSerializedSnapshot='restored-draft'
        onSerializedSnapshotChange={onSerializedSnapshotChange}
        restoreSpy={restoreSpy}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('serialized-snapshot')).toHaveTextContent(
        'restored-draft'
      );
    });

    rerender(
      <SnapshotSyncHarness
        clearSpy={clearSpy}
        initialSerializedSnapshot={null}
        onSerializedSnapshotChange={onSerializedSnapshotChange}
        restoreSpy={restoreSpy}
      />
    );

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(null);
    });
    expect(screen.getByTestId('serialized-snapshot')).toHaveTextContent('');
  });

  it('emits local snapshot updates when no hydration is in progress', async () => {
    const clearSpy = vi.fn();
    const onSerializedSnapshotChange = vi.fn();
    const restoreSpy = vi.fn();

    render(
      <SnapshotSyncHarness
        clearSpy={clearSpy}
        onSerializedSnapshotChange={onSerializedSnapshotChange}
        restoreSpy={restoreSpy}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set local draft' }));

    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith('local-draft');
    });
    expect(restoreSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
