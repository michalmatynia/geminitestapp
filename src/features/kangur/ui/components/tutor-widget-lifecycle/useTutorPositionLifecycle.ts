'use client';

import { useEffect, useLayoutEffect } from 'react';
import type { KangurAiTutorWidgetState } from '../ai-tutor-widget/KangurAiTutorWidget.state';
import type { TutorPoint } from '../ai-tutor-widget/KangurAiTutorWidget.types';
import {
  AVATAR_SIZE,
  EDGE_GAP,
  applyTutorPanelSnapState,
  clampTutorPanelPoint,
} from '../ai-tutor-widget/KangurAiTutorWidget.shared';
import {
  clearPersistedTutorPanelPosition,
  persistTutorAvatarPosition,
  persistTutorPanelPosition,
} from '../ai-tutor-widget/KangurAiTutorWidget.storage';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const clampAvatarPoint = (
  point: TutorPoint,
  viewport: { width: number; height: number }
): TutorPoint => ({
  x: clamp(point.x, EDGE_GAP, viewport.width - EDGE_GAP - AVATAR_SIZE),
  y: clamp(point.y, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE),
});

export function useTutorPositionLifecycle({
  contextualFreeformPanelPoint,
  hasContextualFreeformFocus,
  isOpen,
  uiMode,
  viewport,
  widgetState,
}: {
  contextualFreeformPanelPoint: TutorPoint | null;
  hasContextualFreeformFocus: boolean;
  isOpen: boolean;
  uiMode: 'anchored' | 'freeform' | 'static';
  viewport: { width: number; height: number };
  widgetState: KangurAiTutorWidgetState;
}) {
  const {
    askModalVisible,
    draggedAvatarPoint,
    panelPosition,
    panelPositionMode,
    panelRef,
    panelSnapPreference,
    setDraggedAvatarPoint,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPanelMeasuredHeight,
    setAskModalDockStyle,
    isTutorHidden,
  } = widgetState;

  useEffect(() => {
    if (!draggedAvatarPoint) return;
    const clampedPoint = clampAvatarPoint(draggedAvatarPoint, viewport);
    if (clampedPoint.x === draggedAvatarPoint.x && clampedPoint.y === draggedAvatarPoint.y) return;
    setDraggedAvatarPoint(clampedPoint);
    persistTutorAvatarPosition({ left: clampedPoint.x, top: clampedPoint.y });
  }, [draggedAvatarPoint, setDraggedAvatarPoint, viewport]);

  useEffect(() => {
    if (contextualFreeformPanelPoint !== null || !isOpen || askModalVisible || uiMode !== 'freeform' || panelPositionMode !== 'contextual' || hasContextualFreeformFocus) return;
    setPanelPositionMode('manual');
    if (!panelPosition) { clearPersistedTutorPanelPosition(); return; }
    persistTutorPanelPosition({ left: panelPosition.x, mode: 'manual', snap: panelSnapPreference, top: panelPosition.y });
  }, [askModalVisible, contextualFreeformPanelPoint, hasContextualFreeformFocus, isOpen, panelPosition, panelPositionMode, panelSnapPreference, setPanelPositionMode, uiMode]);

  useEffect(() => {
    if (!contextualFreeformPanelPoint || !isOpen || askModalVisible || uiMode !== 'freeform' || panelPositionMode !== 'contextual') return;
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect || panelRect.width <= 0 || panelRect.height <= 0) return;
    const nextPoint = clampTutorPanelPoint(contextualFreeformPanelPoint, viewport, { width: panelRect.width, height: panelRect.height });
    if (panelPosition?.x === nextPoint.x && panelPosition?.y === nextPoint.y && panelSnapPreference === 'free') return;
    setPanelPosition(nextPoint);
    setPanelSnapPreference('free');
    persistTutorPanelPosition({ left: nextPoint.x, mode: 'contextual', snap: 'free', top: nextPoint.y });
  }, [askModalVisible, contextualFreeformPanelPoint, isOpen, panelPosition, panelPositionMode, panelRef, panelSnapPreference, setPanelPosition, setPanelSnapPreference, uiMode, viewport]);

  useEffect(() => {
    if (!panelPosition || !isOpen || askModalVisible || uiMode !== 'freeform') return;
    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect || panelRect.width <= 0 || panelRect.height <= 0) return;
    const nextPoint = panelSnapPreference === 'free' ? clampTutorPanelPoint(panelPosition, viewport, { width: panelRect.width, height: panelRect.height }) : applyTutorPanelSnapState(panelPosition, panelSnapPreference, viewport, { width: panelRect.width, height: panelRect.height });
    if (nextPoint.x === panelPosition.x && nextPoint.y === panelPosition.y) return;
    setPanelPosition(nextPoint);
    persistTutorPanelPosition({ left: nextPoint.x, mode: panelPositionMode, snap: panelSnapPreference, top: nextPoint.y });
  }, [askModalVisible, isOpen, panelPosition, panelPositionMode, panelRef, panelSnapPreference, setPanelPosition, uiMode, viewport]);

  useLayoutEffect(() => {
    if (!isOpen) { setPanelMeasuredHeight(null); return; }
    const panel = panelRef.current;
    if (!panel) return;
    const updateHeight = () => {
      const nextHeight = Math.ceil(panel.getBoundingClientRect().height);
      if (nextHeight > 0) setPanelMeasuredHeight((current) => current === nextHeight ? current : nextHeight);
    };
    updateHeight();
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [isOpen, panelRef, setPanelMeasuredHeight]);

  useLayoutEffect(() => {
    if (!askModalVisible || !isOpen || isTutorHidden || typeof document === 'undefined') { setAskModalDockStyle(null); return; }
    let frameId = 0;
    const updateDock = () => {
      const askModalHeader = document.querySelector<HTMLElement>('[data-testid=\'kangur-ai-tutor-header\']');
      const askModalSurface = document.querySelector<HTMLElement>('[data-testid=\'kangur-ai-tutor-ask-modal-surface\']');
      const anchorRect = askModalHeader?.getBoundingClientRect() ?? askModalSurface?.getBoundingClientRect();
      if (!anchorRect || anchorRect.width <= 0 || anchorRect.height <= 0) { setAskModalDockStyle(null); return; }
      const nextStyle = { left: anchorRect.left + anchorRect.width / 2 - AVATAR_SIZE / 2, top: Math.max(EDGE_GAP + 8, anchorRect.top - AVATAR_SIZE * 0.42) };
      setAskModalDockStyle((current) => current?.left === nextStyle.left && current?.top === nextStyle.top ? current : nextStyle);
    };
    const scheduleUpdate = () => { window.cancelAnimationFrame(frameId); frameId = window.requestAnimationFrame(updateDock); };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => { window.cancelAnimationFrame(frameId); window.removeEventListener('resize', scheduleUpdate); window.removeEventListener('scroll', scheduleUpdate, true); };
  }, [askModalVisible, isOpen, isTutorHidden, setAskModalDockStyle]);
}
