"use client";

import React, { useCallback, useMemo } from "react";
import { cn } from "@/shared/utils";
import { buildScopedCustomCss, getCustomCssSelector } from "@/features/cms/utils/custom-css";
import {
  getEventClassName,
  getEventEffectsConfig,
  getEventHoverStyle,
  isEventClickEnabled,
} from "@/features/cms/utils/event-effects";
import type { CmsEventEffectsConfig } from "@/features/cms/types/event-effects";

interface EventEffectsWrapperProps {
  settings: Record<string, unknown>;
  disableClick?: boolean;
  nodeId?: string;
  customCss?: unknown;
  children: React.ReactNode;
}

const INTERACTIVE_TAGS = new Set(["a", "button", "input", "select", "textarea", "label"]);

const isInteractiveElement = (element: React.ReactNode): boolean => {
  if (!React.isValidElement(element)) return false;
  return typeof element.type === "string" && INTERACTIVE_TAGS.has(element.type);
};

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("a,button,input,select,textarea,label"));
};

const normalizeScrollTarget = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

export function EventEffectsWrapper({
  settings,
  disableClick = false,
  nodeId,
  customCss,
  children,
}: EventEffectsWrapperProps): React.ReactNode {
  const config = useMemo<CmsEventEffectsConfig>(
    () => getEventEffectsConfig(settings),
    [settings]
  );
  const hoverStyle = useMemo(
    () => getEventHoverStyle(config),
    [config]
  );
  const eventClassName = useMemo(
    () => getEventClassName(config, { disableClick }),
    [config, disableClick]
  );
  const customCssSelector = nodeId ? getCustomCssSelector(nodeId) : null;
  const scopedCustomCss = useMemo(
    () => buildScopedCustomCss(customCss, customCssSelector),
    [customCss, customCssSelector]
  );
  const customClassName = nodeId ? `cms-node-${nodeId}` : "";
  const clickEnabled = isEventClickEnabled(config, disableClick);
  const childIsInteractive = isInteractiveElement(children);

  const handleClick = useCallback(
    (event: React.MouseEvent): void => {
      if (!clickEnabled) return;
      if (isInteractiveTarget(event.target)) return;

      if (config.clickAction === "navigate") {
        const url = config.clickUrl.trim();
        if (!url) return;
        event.preventDefault();
        event.stopPropagation();
        if (config.clickTarget === "_blank") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          window.location.assign(url);
        }
        return;
      }

      if (config.clickAction === "scroll") {
        const target = normalizeScrollTarget(config.clickScrollTarget);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: config.clickScrollBehavior, block: "start" });
        }
      }
    },
    [clickEnabled, config]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      if (!clickEnabled) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleClick(event as unknown as React.MouseEvent);
    },
    [clickEnabled, handleClick]
  );

  if (children === null || children === undefined) return children;

  if (!React.isValidElement(children)) {
    if (!eventClassName && Object.keys(hoverStyle).length === 0 && !scopedCustomCss && !customClassName) {
      return children;
    }

    return (
      <>
        {scopedCustomCss ? <style data-cms-custom-css={nodeId}>{scopedCustomCss}</style> : null}
        <div
          className={cn(eventClassName, customClassName)}
          style={hoverStyle}
          onClick={clickEnabled ? handleClick : undefined}
          onKeyDown={clickEnabled ? handleKeyDown : undefined}
          role={clickEnabled ? "button" : undefined}
          tabIndex={clickEnabled ? 0 : undefined}
        >
          {children}
        </div>
      </>
    );
  }

  const existingClassName = (children.props as { className?: string }).className;
  const existingStyle = (children.props as { style?: React.CSSProperties }).style;
  const isFragment = children.type === React.Fragment;
  const mergedClassName = cn(existingClassName, eventClassName, customClassName);
  const mergedStyle = Object.keys(hoverStyle).length
    ? { ...(existingStyle ?? {}), ...hoverStyle }
    : existingStyle;

  const nextProps: Record<string, unknown> = isFragment
    ? {}
    : {
        className: mergedClassName,
        style: mergedStyle,
      };

  if (clickEnabled && !isFragment) {
    const existingOnClick = (children.props as { onClick?: (event: React.MouseEvent) => void }).onClick;
    const existingOnKeyDown = (children.props as { onKeyDown?: (event: React.KeyboardEvent) => void }).onKeyDown;
    nextProps.onClick = (event: React.MouseEvent): void => {
      existingOnClick?.(event);
      if (!event.defaultPrevented) handleClick(event);
    };
    nextProps.onKeyDown = (event: React.KeyboardEvent): void => {
      existingOnKeyDown?.(event);
      if (!event.defaultPrevented) handleKeyDown(event);
    };
    if (!childIsInteractive) {
      nextProps.role = "button";
      nextProps.tabIndex = 0;
    }
  }

  if (isFragment) {
    return (
      <>
        {scopedCustomCss ? <style data-cms-custom-css={nodeId}>{scopedCustomCss}</style> : null}
        <div
          className={cn(eventClassName, customClassName)}
          style={hoverStyle}
          onClick={clickEnabled ? handleClick : undefined}
          onKeyDown={clickEnabled ? handleKeyDown : undefined}
          role={clickEnabled ? "button" : undefined}
          tabIndex={clickEnabled ? 0 : undefined}
        >
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      {scopedCustomCss ? <style data-cms-custom-css={nodeId}>{scopedCustomCss}</style> : null}
      {React.cloneElement(children, nextProps)}
    </>
  );
}
