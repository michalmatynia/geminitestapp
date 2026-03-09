import React from 'react';
import type { AiNode } from '@/shared/contracts/ai-paths';
import { type TriggerEventEntityType } from '@/shared/contracts/ai-trigger-buttons';
import {
  sanitizeTriggerEntitySnapshot,
  shouldEmbedTriggerEntitySnapshot,
} from './trigger-event-sanitization';

export const buildTriggerContext = (args: {
  triggerNode: AiNode;
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  entityJson?: Record<string, unknown> | null;
  event?: React.MouseEvent;
  pathInfo?: { id?: string | undefined; name?: string | undefined } | null | undefined;
  source?:
    | { tab?: string | undefined; location?: string | undefined; page?: string | undefined }
    | null
    | undefined;
  extras?: Record<string, unknown> | null | undefined;
}): Record<string, unknown> => {
  const timestamp = new Date().toISOString();
  const sanitizedEntitySnapshot = sanitizeTriggerEntitySnapshot(args.entityJson);
  const shouldEmbedEntitySnapshot =
    sanitizedEntitySnapshot !== null &&
    shouldEmbedTriggerEntitySnapshot({
      entityType: args.entityType,
      entityId: args.entityId,
      sourceLocation: args.source?.location,
    });
  const embeddedEntitySnapshot = shouldEmbedEntitySnapshot ? sanitizedEntitySnapshot : null;
  const nativeEvent = args.event?.nativeEvent;
  const pointer = nativeEvent
    ? {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: nativeEvent.offsetX,
      offsetY: nativeEvent.offsetY,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      metaKey: nativeEvent.metaKey,
    }
    : undefined;

  const location =
    typeof window !== 'undefined'
      ? {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer || undefined,
      }
      : {};

  const ui =
    typeof window !== 'undefined'
      ? {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        screen: {
          width: window.screen?.width,
          height: window.screen?.height,
          availWidth: window.screen?.availWidth,
          availHeight: window.screen?.availHeight,
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        documentTitle: document.title,
        visibilityState: document.visibilityState,
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      }
      : {};

  const base: Record<string, unknown> = {
    timestamp,
    location,
    ui,
    user: null,
    event: {
      id: args.triggerEventId,
      nodeId: args.triggerNode.id,
      nodeTitle: args.triggerNode.title,
      type: args.event?.type,
      pointer,
    },
    source: {
      pathId: args.pathInfo?.id,
      pathName: args.pathInfo?.name ?? 'AI Trigger Button',
      tab: args.source?.tab ?? args.entityType,
      location: args.source?.location ?? null,
      page: args.source?.page ?? null,
    },
    extras: {
      triggerLabel: args.triggerLabel ?? null,
      ...(args.extras ?? {}),
    },
    entityId: args.entityId ?? null,
    entityType: args.entityType,
    entity: embeddedEntitySnapshot,
    ...(embeddedEntitySnapshot ? { entityJson: embeddedEntitySnapshot } : {}),
    ...(embeddedEntitySnapshot && args.entityType === 'product' && args.entityId
      ? { productId: args.entityId }
      : {}),
  };

  return base;
};
