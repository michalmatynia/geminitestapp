'use client';

import { useEffect, useRef, type RefObject } from 'react';

type UseKangurCanvasRedrawInput = {
  canvasRef: RefObject<Element | null>;
  redraw: () => void;
};

export const useKangurCanvasRedraw = ({
  canvasRef,
  redraw,
}: UseKangurCanvasRedrawInput): void => {
  const redrawRef = useRef(redraw);

  useEffect(() => {
    redrawRef.current = redraw;
  }, [redraw]);

  useEffect(() => {
    const handleResize = (): void => {
      redrawRef.current();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    if (typeof ResizeObserver === 'function') {
      const surface = canvasRef.current;
      if (surface) {
        const observer = new ResizeObserver(() => {
          handleResize();
        });
        observer.observe(surface);
        handleResize();
        return () => {
          observer.disconnect();
          if (typeof window !== 'undefined') {
            window.removeEventListener('resize', handleResize);
          }
        };
      }
    }

    handleResize();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [canvasRef]);
};
