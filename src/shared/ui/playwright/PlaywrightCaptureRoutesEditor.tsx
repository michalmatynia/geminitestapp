'use client';

import React, { createContext, useContext, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

import type { PlaywrightConfigCaptureRoute } from '@/shared/contracts/ai-paths-core/nodes';
import { buildCaptureRouteUrl } from '@/shared/lib/ai-paths/core/playwright/capture-defaults';
import {
  formatSelectorRegistryRoleLabel,
  getCaptureCompatibleSelectorRoles,
} from '@/shared/lib/browser-execution/selector-registry-roles';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

const createRouteId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyRoute = (): PlaywrightConfigCaptureRoute => ({
  id: createRouteId(),
  title: '',
  path: '/',
  description: '',
  selector: null,
  selectorRole: null,
  waitForMs: null,
  waitForSelectorMs: 15_000,
});

const APPEARANCE_MODE_OPTIONS = [
  { value: '', label: 'Default (no override)' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const CAPTURE_SELECTOR_ROLE_OPTIONS = [
  { value: '', label: 'Auto / untyped' },
  ...getCaptureCompatibleSelectorRoles().map((role) => ({
    value: role,
    label: formatSelectorRegistryRoleLabel(role) ?? role,
  })),
];

type RoutePatch = Partial<PlaywrightConfigCaptureRoute>;
type CaptureSelectorRole = Exclude<PlaywrightConfigCaptureRoute['selectorRole'], null | undefined>;

const normalizeRouteText = (value: string | undefined, fallback = ''): string => value ?? fallback;

const parseCaptureSelectorRole = (value: string): CaptureSelectorRole | null =>
  getCaptureCompatibleSelectorRoles().includes(value as CaptureSelectorRole)
    ? (value as CaptureSelectorRole)
    : null;

type PlaywrightCaptureRoutesEditorContextValue = {
  baseUrl: string;
  onUpdateRoute: (index: number, patch: RoutePatch) => void;
  onDeleteRoute: (index: number) => void;
  onChange: (patch: {
    routes?: PlaywrightConfigCaptureRoute[];
    baseUrl?: string;
    appearanceMode?: string;
  }) => void;
};

const PlaywrightCaptureRoutesEditorContext = createContext<PlaywrightCaptureRoutesEditorContextValue | null>(null);

function usePlaywrightCaptureRoutesEditor() {
  const context = useContext(PlaywrightCaptureRoutesEditorContext);
  if (!context) {
    throw new Error('PlaywrightCaptureRoutesEditor sub-components must be used within its Provider');
  }
  return context;
}

type RouteRowProps = {
  route: PlaywrightConfigCaptureRoute;
  index: number;
};

function RouteRow({ route, index }: RouteRowProps): React.JSX.Element {
  const { baseUrl, onUpdateRoute, onDeleteRoute } = usePlaywrightCaptureRoutesEditor();
  const [expanded, setExpanded] = useState(false);
  const routeTitle = normalizeRouteText(route.title);
  const routePath = normalizeRouteText(route.path, '/');

  const resolvedUrl = buildCaptureRouteUrl(baseUrl, routePath);
  const hasIssue = !resolvedUrl;

  const onUpdate = (patch: RoutePatch) => onUpdateRoute(index, patch);
  const onDelete = () => onDeleteRoute(index);
  return (
    <div className='rounded-lg border border-border/50 bg-background/40'>
      {/* Header row */}
      <div className='flex items-center gap-2 px-2.5 py-1.5'>
        <button
          type='button'
          className='shrink-0 text-muted-foreground hover:text-foreground'
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse route' : 'Expand route'}
        >
          {expanded ? (
            <ChevronDown className='h-3 w-3' />
          ) : (
            <ChevronRight className='h-3 w-3' />
          )}
        </button>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[11px] font-medium text-foreground truncate'>
              {routeTitle.trim() || <span className='text-muted-foreground italic'>Untitled</span>}
            </span>
            <span className='text-muted-foreground/60 text-[10px] truncate'>{routePath}</span>
          </div>
          {resolvedUrl ? (
            <div className='text-[9px] text-muted-foreground/70 truncate font-mono'>{resolvedUrl}</div>
          ) : hasIssue ? (
            <div className='text-[9px] text-amber-400/80'>
              {!routePath.trim() ? 'Add a path.' : 'Add a base URL to resolve this route.'}
            </div>
          ) : null}
        </div>

        <button
          type='button'
          className='shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors'
          onClick={onDelete}
          aria-label='Delete route'
        >
          <Trash2 className='h-3 w-3' />
        </button>
      </div>

      {/* Expanded edit fields */}
      {expanded && (
        <div className='border-t border-border/40 px-3 py-3 space-y-2.5'>
          <div className='grid gap-2 sm:grid-cols-2'>
            <FormField label='Title'>
              <Input
                variant='subtle'
                size='sm'
                value={routeTitle}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder='e.g. Homepage'
                aria-label='Route title'
              />
            </FormField>
            <FormField label='Path or URL'>
              <Input
                variant='subtle'
                size='sm'
                value={routePath}
                onChange={(e) => onUpdate({ path: e.target.value })}
                placeholder='/about or https://…'
                aria-label='Route path'
                className={cn(hasIssue && 'border-amber-500/50')}
              />
            </FormField>
          </div>

          <FormField
            label='CSS Selector (optional)'
            description='Capture only the matched element instead of the full page.'
          >
            <Input
              variant='subtle'
              size='sm'
              value={route.selector ?? ''}
              onChange={(e) =>
                onUpdate({
                  selector: e.target.value.trim() || null,
                  ...(e.target.value.trim() ? {} : { selectorRole: null }),
                })
              }
              placeholder='#main-content'
              aria-label='CSS selector'
            />
          </FormField>

          <FormField
            label='Selector Role'
            description='Optional semantic classification for element-targeted captures.'
          >
            <SelectSimple
              size='sm'
              variant='subtle'
              value={route.selectorRole ?? ''}
              onValueChange={(value) => onUpdate({ selectorRole: parseCaptureSelectorRole(value) })}
              options={CAPTURE_SELECTOR_ROLE_OPTIONS}
              disabled={!route.selector}
            />
          </FormField>

          <div className='grid gap-2 sm:grid-cols-2'>
            <FormField label='Settle delay (ms)'>
              <Input
                variant='subtle'
                size='sm'
                type='number'
                min={0}
                step={500}
                value={route.waitForMs ?? ''}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  onUpdate({ waitForMs: Number.isFinite(parsed) && parsed >= 0 ? parsed : null });
                }}
                placeholder='2000'
                aria-label='Settle delay ms'
              />
            </FormField>
            <FormField label='Selector timeout (ms)'>
              <Input
                variant='subtle'
                size='sm'
                type='number'
                min={0}
                step={1000}
                value={route.waitForSelectorMs ?? ''}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  onUpdate({
                    waitForSelectorMs: Number.isFinite(parsed) && parsed >= 0 ? parsed : null,
                  });
                }}
                placeholder='15000'
                aria-label='Selector timeout ms'
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}

export type PlaywrightCaptureRoutesEditorProps = {
  routes: PlaywrightConfigCaptureRoute[];
  baseUrl: string;
  appearanceMode: string;
  onChange: (patch: {
    routes?: PlaywrightConfigCaptureRoute[];
    baseUrl?: string;
    appearanceMode?: string;
  }) => void;
};

export function PlaywrightCaptureRoutesEditor({
  routes,
  baseUrl,
  appearanceMode,
  onChange,
}: PlaywrightCaptureRoutesEditorProps): React.JSX.Element {
  const updateRoute = (index: number, patch: RoutePatch): void => {
    const next = routes.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange({ routes: next });
  };

  const deleteRoute = (index: number): void => {
    onChange({ routes: routes.filter((_, i) => i !== index) });
  };

  const addRoute = (): void => {
    onChange({ routes: [...routes, createEmptyRoute()] });
  };

  return (
    <PlaywrightCaptureRoutesEditorContext.Provider
      value={{
        baseUrl,
        onUpdateRoute: updateRoute,
        onDeleteRoute: deleteRoute,
        onChange,
      }}
    >
      <div className='space-y-3'>
      <FormField
        label='Base URL'
        description='Relative paths are resolved against this URL.'
      >
        <Input
          variant='subtle'
          size='sm'
          value={baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
          placeholder='https://your-app.com'
          aria-label='Capture base URL'
        />
      </FormField>

      <FormField
        label='Appearance Mode'
        description='Injected as appearanceMode input — the capture script waits for the matching CSS attribute.'
      >
        <SelectSimple
          size='sm'
          variant='subtle'
          value={appearanceMode}
          onValueChange={(value) => onChange({ appearanceMode: value })}
          options={APPEARANCE_MODE_OPTIONS}
          ariaLabel='Appearance mode'
          title='Appearance mode'
        />
      </FormField>

      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
            Capture Routes
            <span className='ml-1.5 font-normal text-muted-foreground/60'>({routes.length})</span>
          </span>
          <Button
            type='button'
            variant='outline'
            size='xs'
            className='h-6 gap-1'
            onClick={addRoute}
          >
            <Plus className='h-2.5 w-2.5' />
            Add
          </Button>
        </div>

        {routes.length === 0 ? (
          <div className='rounded-lg border border-dashed border-border/50 px-3 py-4 text-center text-[11px] text-muted-foreground'>
            No routes configured. Add a route or wire the{' '}
            <span className='font-mono text-foreground/70'>captures</span> input port.
          </div>
        ) : (
          <div className='space-y-1.5'>
            {routes.map((route, index) => (
              <RouteRow
                key={route.id}
                route={route}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  </PlaywrightCaptureRoutesEditorContext.Provider>
);
}
