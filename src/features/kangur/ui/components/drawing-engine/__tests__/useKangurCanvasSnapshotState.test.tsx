/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurCanvasSnapshotState } from '../useKangurCanvasSnapshotState';

type SnapshotHarnessSnapshot = {
  logicalHeight: number;
  logicalWidth: number;
  strokes: string[];
  version: 1;
};

function SnapshotStateHarness({
  initialSerializedSnapshot = null,
  onSerializedSnapshotChange,
}: {
  initialSerializedSnapshot?: string | null;
  onSerializedSnapshotChange?: (raw: string | null) => void;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<string[]>([]);
  const {
    exportDataUrl,
    hasDrawableContent,
    restoreSerializedSnapshot,
    serializeSnapshot,
  } = useKangurCanvasSnapshotState<SnapshotHarnessSnapshot, string[]>({
    canvasRef,
    clearSnapshot: () => setStrokes([]),
    createSnapshot: ({ logicalHeight, logicalWidth, strokes: nextStrokes }) => ({
      logicalHeight,
      logicalWidth,
      strokes: nextStrokes,
      version: 1,
    }),
    hasDrawableContent: strokes.length > 0,
    initialSerializedSnapshot,
    logicalHeight: 220,
    logicalWidth: 320,
    onSerializedSnapshotChange,
    parseSnapshot: (raw) => {
      try {
        return JSON.parse(raw) as SnapshotHarnessSnapshot;
      } catch {
        return null;
      }
    },
    rescaleSnapshot: (snapshot) => snapshot.strokes,
    serializeSnapshotData: (snapshot) => JSON.stringify(snapshot),
    setStrokes,
    strokes,
  });

  return (
    <>
      <canvas ref={canvasRef} aria-label='Snapshot state canvas' />
      <button type='button' onClick={() => setStrokes(['stroke-a'])}>
        Draw
      </button>
      <button type='button' onClick={() => setStrokes([])}>
        Clear local
      </button>
      <button
        type='button'
        onClick={() =>
          restoreSerializedSnapshot(
            JSON.stringify({
              logicalHeight: 220,
              logicalWidth: 320,
              strokes: ['restored-stroke'],
              version: 1,
            } satisfies SnapshotHarnessSnapshot)
          )
        }
      >
        Restore
      </button>
      <button
        type='button'
        onClick={() => {
          exportDataUrl();
        }}
      >
        Export
      </button>
      <div data-testid='drawable-content'>{hasDrawableContent ? 'yes' : 'no'}</div>
      <div data-testid='serialized-snapshot'>
        {hasDrawableContent ? serializeSnapshot() : ''}
      </div>
    </>
  );
}

describe('useKangurCanvasSnapshotState', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,GENERIC'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serializes current strokes and restores them from the shared snapshot contract', () => {
    render(<SnapshotStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));

    expect(screen.getByTestId('drawable-content')).toHaveTextContent('yes');
    expect(screen.getByTestId('serialized-snapshot').textContent).toContain(
      '"stroke-a"'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear local' }));
    expect(screen.getByTestId('drawable-content')).toHaveTextContent('no');

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(screen.getByTestId('serialized-snapshot').textContent).toContain(
      '"restored-stroke"'
    );
  });

  it('exports through the shared canvas export path', () => {
    render(<SnapshotStateHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('emits hydrated and local snapshot updates through the shared callback', async () => {
    const onSerializedSnapshotChange = vi.fn();

    render(
      <SnapshotStateHarness
        initialSerializedSnapshot={JSON.stringify({
          logicalHeight: 220,
          logicalWidth: 320,
          strokes: ['hydrated-stroke'],
          version: 1,
        } satisfies SnapshotHarnessSnapshot)}
        onSerializedSnapshotChange={onSerializedSnapshotChange}
      />
    );

    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(
        JSON.stringify({
          logicalHeight: 220,
          logicalWidth: 320,
          strokes: ['hydrated-stroke'],
          version: 1,
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear local' }));
    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(null);
    });
  });
});
