'use client';

import React from 'react';

export const getPointerCaptureTarget = (
  event: React.PointerEvent<HTMLElement>
):
  | (Element & {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    })
  | null => {
  const nativeCurrentTarget = event.nativeEvent.currentTarget;
  const candidates: EventTarget[] = [
    event.currentTarget,
    ...(nativeCurrentTarget ? [nativeCurrentTarget] : []),
    event.target,
  ];
  for (const candidate of candidates) {
    if (candidate instanceof Element) {
      return candidate as Element & {
        setPointerCapture?: (pointerId: number) => void;
        releasePointerCapture?: (pointerId: number) => void;
        hasPointerCapture?: (pointerId: number) => boolean;
      };
    }
  }
  return null;
};

export const setPointerCaptureSafe = (
  target: (Element & { setPointerCapture?: (pointerId: number) => void }) | null,
  pointerId: number
): void => {
  if (!target || typeof target.setPointerCapture !== 'function') return;
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Ignore pointer-capture errors from detached/non-capturing targets.
  }
};

export const releasePointerCaptureSafe = (
  target:
    | (Element & {
        releasePointerCapture?: (pointerId: number) => void;
        hasPointerCapture?: (pointerId: number) => boolean;
      })
    | null,
  pointerId: number
): void => {
  if (!target || typeof target.releasePointerCapture !== 'function') return;
  try {
    if (typeof target.hasPointerCapture !== 'function' || target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  } catch {
    // Ignore release failures for already-detached targets.
  }
};

export const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
};
