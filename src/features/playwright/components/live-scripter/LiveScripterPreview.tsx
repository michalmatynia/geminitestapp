'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';

type Frame = {
  dataUrl: string;
  width: number;
  height: number;
};

type Props = {
  frame: Frame | null;
  pickedElement: LiveScripterPickedElement | null;
  mode: 'drive' | 'pick';
  status: 'idle' | 'starting' | 'live' | 'error';
  onDriveClick: (x: number, y: number) => void;
  onPickAt: (x: number, y: number) => void;
  onDriveScroll: (deltaX: number, deltaY: number) => void;
};

const toCanvasPoint = (
  event: React.MouseEvent<HTMLCanvasElement>,
  frame: Frame
): { x: number; y: number } => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * frame.width;
  const y = ((event.clientY - rect.top) / rect.height) * frame.height;
  return {
    x: Math.max(0, Math.min(frame.width, x)),
    y: Math.max(0, Math.min(frame.height, y)),
  };
};

function LiveScripterPreviewEmptyState({
  status,
}: {
  status: Props['status'];
}): React.JSX.Element {
  return (
    <div className='flex aspect-[16/10] items-center justify-center text-sm text-muted-foreground'>
      {status === 'starting'
        ? 'Starting live browser session...'
        : 'Start a session to render the page preview.'}
    </div>
  );
}

function LiveScripterPreviewCanvas({
  canvasRef,
  frame,
  mode,
  onDriveClick,
  onPickAt,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  frame: Frame;
  mode: Props['mode'];
  onDriveClick: Props['onDriveClick'];
  onPickAt: Props['onPickAt'];
}): React.JSX.Element {
  return (
    <canvas
      ref={canvasRef}
      aria-label='Live website preview'
      className='block h-auto w-full cursor-crosshair'
      onClick={(event) => {
        const point = toCanvasPoint(event, frame);
        if (mode === 'pick') {
          onPickAt(point.x, point.y);
          return;
        }
        onDriveClick(point.x, point.y);
      }}
    />
  );
}

function LiveScripterPreviewHeader({
  mode,
}: {
  mode: Props['mode'];
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='text-sm font-medium'>Live Preview</div>
      <div className='text-xs text-muted-foreground'>
        {mode === 'pick'
          ? 'Pick mode inspects the clicked element.'
          : 'Drive mode forwards clicks and wheel input to the page.'}
      </div>
    </div>
  );
}

function LiveScripterPreviewSurface({
  frame,
  status,
  overlayStyle,
  canvasRef,
  mode,
  onDriveClick,
  onPickAt,
}: {
  frame: Frame | null;
  status: Props['status'];
  overlayStyle: React.CSSProperties | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mode: Props['mode'];
  onDriveClick: Props['onDriveClick'];
  onPickAt: Props['onPickAt'];
}): React.JSX.Element {
  return (
    <div className='relative overflow-hidden overscroll-contain rounded-md border border-white/10 bg-black'>
      {frame === null ? (
        <LiveScripterPreviewEmptyState status={status} />
      ) : (
        <>
          <LiveScripterPreviewCanvas
            canvasRef={canvasRef}
            frame={frame}
            mode={mode}
            onDriveClick={onDriveClick}
            onPickAt={onPickAt}
          />
          {overlayStyle !== null ? (
            <div
              className='pointer-events-none absolute border-2 border-sky-400 bg-sky-500/10'
              style={overlayStyle}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export function LiveScripterPreview({
  frame,
  pickedElement,
  mode,
  status,
  onDriveClick,
  onPickAt,
  onDriveScroll,
}: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || frame === null) {
      return;
    }

    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      canvas.width = frame.width;
      canvas.height = frame.height;
      context.clearRect(0, 0, frame.width, frame.height);
      context.drawImage(image, 0, 0, frame.width, frame.height);
    };
    image.src = frame.dataUrl;
  }, [frame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || frame === null) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      if (mode !== 'drive') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onDriveScroll(event.deltaX, event.deltaY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [frame, mode, onDriveScroll]);

  const overlayStyle = useMemo(() => {
    if (frame === null || pickedElement === null) {
      return null;
    }
    return {
      left: `${(pickedElement.boundingBox.x / frame.width) * 100}%`,
      top: `${(pickedElement.boundingBox.y / frame.height) * 100}%`,
      width: `${(pickedElement.boundingBox.width / frame.width) * 100}%`,
      height: `${(pickedElement.boundingBox.height / frame.height) * 100}%`,
    };
  }, [frame, pickedElement]);

  return (
    <div className='space-y-2 rounded-lg border border-white/10 bg-black/10 p-4'>
      <LiveScripterPreviewHeader mode={mode} />
      <LiveScripterPreviewSurface
        frame={frame}
        status={status}
        overlayStyle={overlayStyle}
        canvasRef={canvasRef}
        mode={mode}
        onDriveClick={onDriveClick}
        onPickAt={onPickAt}
      />
    </div>
  );
}
