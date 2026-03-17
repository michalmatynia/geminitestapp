import { useEffect } from 'react';
import type { RefObject } from 'react';

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
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const previousTouchAction = canvas.style.touchAction;
    if (canvas.style.touchAction !== 'none') {
      canvas.style.touchAction = 'none';
    }

    const preventDefault = (event: any): void => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    TOUCH_EVENTS.forEach((eventName) => {
      canvas.addEventListener(eventName, preventDefault, { passive: false });
    });

    return () => {
      TOUCH_EVENTS.forEach((eventName) => {
        canvas.removeEventListener(eventName, preventDefault);
      });
      canvas.style.touchAction = previousTouchAction;
    };
  }, [canvasRef, enabled]);
};
