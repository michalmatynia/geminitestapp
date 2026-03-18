import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useKangurMobileInteractionScrollLock } from '@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock';

type CanvasTouchLockOptions = {
  enabled?: boolean;
};

const TOUCH_EVENTS: Array<keyof HTMLElementEventMap> = [
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
];

export const useKangurCanvasTouchLock = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { enabled = true }: CanvasTouchLockOptions = {}
): void => {
  const { lock, unlock } = useKangurMobileInteractionScrollLock();
  const isActiveRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const previousTouchAction = canvas.style.touchAction;
    if (canvas.style.touchAction !== 'none') {
      canvas.style.touchAction = 'none';
    }

    const preventDefault: EventListener = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const handleStart: EventListener = () => {
      if (isActiveRef.current) {
        return;
      }
      isActiveRef.current = true;
      lock();
    };

    const handleEnd: EventListener = () => {
      if (!isActiveRef.current) {
        return;
      }
      isActiveRef.current = false;
      unlock();
    };

    TOUCH_EVENTS.forEach((eventName) => {
      canvas.addEventListener(eventName, preventDefault, { passive: false });
    });
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchend', handleEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleEnd, { passive: false });
    canvas.addEventListener('pointerdown', handleStart, { passive: false });
    canvas.addEventListener('pointerup', handleEnd, { passive: false });
    canvas.addEventListener('pointercancel', handleEnd, { passive: false });
    canvas.addEventListener('pointerleave', handleEnd, { passive: false });
    canvas.addEventListener('lostpointercapture', handleEnd, { passive: false });

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerup', handleEnd, { passive: false });
      document.addEventListener('pointercancel', handleEnd, { passive: false });
      document.addEventListener('touchend', handleEnd, { passive: false });
      document.addEventListener('touchcancel', handleEnd, { passive: false });
    }

    return () => {
      TOUCH_EVENTS.forEach((eventName) => {
        canvas.removeEventListener(eventName, preventDefault);
      });
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('touchcancel', handleEnd);
      canvas.removeEventListener('pointerdown', handleStart);
      canvas.removeEventListener('pointerup', handleEnd);
      canvas.removeEventListener('pointercancel', handleEnd);
      canvas.removeEventListener('pointerleave', handleEnd);
      canvas.removeEventListener('lostpointercapture', handleEnd);
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerup', handleEnd);
        document.removeEventListener('pointercancel', handleEnd);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
      }
      if (isActiveRef.current) {
        unlock();
        isActiveRef.current = false;
      }
      canvas.style.touchAction = previousTouchAction;
    };
  }, [canvasRef, enabled, lock, unlock]);
};
