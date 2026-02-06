'use client';

import React from 'react';

export type DropPosition = 'before' | 'after' | 'inside';

interface DropTargetIndicatorProps {
  /** Position of the indicator relative to the target */
  position: DropPosition;
  /** Whether this indicator is currently active (being hovered) */
  isActive: boolean;
  /** Whether the drop would be valid */
  isValid: boolean;
  /** Optional label showing what's being dragged */
  draggedItemLabel?: string;
  /** Optional reason why the drop is invalid */
  invalidReason?: string;
  /** Orientation of the indicator line */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Visual indicator component for drag-and-drop targets.
 * Shows where an item will be dropped and whether it's valid.
 */
export function DropTargetIndicator({
  position,
  isActive,
  isValid,
  draggedItemLabel,
  invalidReason,
  orientation = 'horizontal',
}: DropTargetIndicatorProps): React.ReactNode {
  if (!isActive) return null;

  // For "inside" position, we show a highlight on the container
  if (position === 'inside') {
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-50 rounded transition-all duration-150 ${
          isValid
            ? 'ring-2 ring-emerald-500/60 bg-emerald-500/10'
            : 'ring-2 ring-red-500/60 bg-red-500/10'
        }`}
      >
        {/* Tooltip showing drag info */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium whitespace-nowrap ${
            isValid
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {isValid ? (
            draggedItemLabel ? `Drop ${draggedItemLabel} here` : 'Drop here'
          ) : (
            invalidReason ?? 'Cannot drop here'
          )}
        </div>
      </div>
    );
  }

  // For "before" and "after" positions, we show a line indicator
  const isHorizontal = orientation === 'horizontal';
  const lineStyles: React.CSSProperties = isHorizontal
    ? {
      left: 0,
      right: 0,
      height: '2px',
      ...(position === 'before' ? { top: 0 } : { bottom: 0 }),
    }
    : {
      top: 0,
      bottom: 0,
      width: '2px',
      ...(position === 'before' ? { left: 0 } : { right: 0 }),
    };

  return (
    <div
      className={`pointer-events-none absolute z-50 transition-all duration-150 ${
        isValid ? 'bg-emerald-500' : 'bg-red-500'
      }`}
      style={lineStyles}
    >
      {/* Small circle indicator at the start of the line */}
      <div
        className={`absolute rounded-full ${
          isValid ? 'bg-emerald-500' : 'bg-red-500'
        }`}
        style={
          isHorizontal
            ? { left: 0, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px' }
            : { top: 0, left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px' }
        }
      />
      {/* Small circle indicator at the end of the line */}
      <div
        className={`absolute rounded-full ${
          isValid ? 'bg-emerald-500' : 'bg-red-500'
        }`}
        style={
          isHorizontal
            ? { right: 0, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px' }
            : { bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px' }
        }
      />
    </div>
  );
}

/**
 * Helper component for showing drop zones between items in a list.
 * Use this as a separator between tree node items.
 */
interface DropZoneSeparatorProps {
  /** Whether this zone is currently being hovered */
  isActive: boolean;
  /** Whether a drop here would be valid */
  isValid: boolean;
  /** Height of the separator zone */
  height?: number;
}

export function DropZoneSeparator({
  isActive,
  isValid,
  height = 4,
}: DropZoneSeparatorProps): React.ReactNode {
  return (
    <div
      className={`relative transition-all duration-150 ${
        isActive ? (isValid ? 'bg-emerald-500/30' : 'bg-red-500/30') : ''
      }`}
      style={{ height: isActive ? `${height}px` : '0px' }}
    >
      {isActive && (
        <div
          className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 ${
            isValid ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
      )}
    </div>
  );
}

/**
 * CSS classes for drag state styling on tree nodes.
 */
export const dragStateClasses = {
  /** Applied when the node is being dragged */
  dragging: 'opacity-40 scale-95',
  /** Applied when hovering over a valid drop target */
  validDropTarget: 'ring-2 ring-emerald-500/50 bg-emerald-500/10',
  /** Applied when hovering over an invalid drop target */
  invalidDropTarget: 'ring-2 ring-red-500/50 bg-red-500/10',
  /** Applied to show insertion point before */
  insertBefore: 'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-emerald-500',
  /** Applied to show insertion point after */
  insertAfter: 'after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:bg-emerald-500',
};

/**
 * Calculate drop position based on mouse position relative to element.
 * Returns "before", "after", or "inside" based on where in the element the mouse is.
 */
export function calculateDropPosition(
  e: React.DragEvent,
  rect: DOMRect,
  /** Threshold as percentage of element height for before/after zones */
  threshold: number = 0.25
): DropPosition {
  const relativeY = e.clientY - rect.top;
  const thresholdPx = rect.height * threshold;

  if (relativeY < thresholdPx) return 'before';
  if (relativeY > rect.height - thresholdPx) return 'after';
  return 'inside';
}
