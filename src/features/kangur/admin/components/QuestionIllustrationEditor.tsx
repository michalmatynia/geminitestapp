'use client';

import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button, FormField, Input, SelectSimple } from '@/shared/ui';
import { cn, sanitizeSvg } from '@/shared/utils';
import type {
  KangurIllustrationPanel,
  KangurQuestionIllustration,
  KangurTestChoice,
} from '@/shared/contracts/kangur-tests';
import { createPanelIllustration } from '../../test-questions';
import { SvgCodeEditor } from './SvgCodeEditor';

// ── Constants ─────────────────────────────────────────────────────────────────

const SVG_TYPE_OPTIONS = [
  { value: 'none', label: 'No illustration' },
  { value: 'single', label: 'Single SVG' },
  { value: 'panels', label: 'Panels (A/B/C/D/E)' },
];

const LAYOUT_OPTIONS = [
  { value: 'row', label: 'Row' },
  { value: 'grid-2x2', label: '2×2 grid' },
  { value: 'grid-3x2', label: '3×2 grid' },
];

const PANEL_COUNT_OPTIONS = [2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: String(n),
}));

const BLANK_SQUARE_SVG =
  '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">\n  <rect x="5" y="5" width="50" height="50" fill="white" stroke="#374151" stroke-width="1.5"/>\n  <!-- 4×4 dashed grid -->\n  <line x1="15" y1="0" x2="15" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="30" y1="0" x2="30" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="45" y1="0" x2="45" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="15" x2="60" y2="15" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="30" x2="60" y2="30" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="45" x2="60" y2="45" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n</svg>';

const createPanelId = (): string =>
  `panel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ── PanelEditor ───────────────────────────────────────────────────────────────

function PanelEditor({
  panel,
  onSvgChange,
  onLabelChange,
  onDescChange,
  onDelete,
  canDelete,
}: {
  panel: KangurIllustrationPanel;
  onSvgChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}): React.JSX.Element {
  return (
    <div className='rounded-2xl border border-border/60 bg-card/30 p-3 space-y-3'>
      {/* Panel header: label input + blank preset + delete */}
      <div className='flex items-center gap-2'>
        <Input
          value={panel.label}
          onChange={(e): void => onLabelChange(e.target.value)}
          className='h-7 w-12 shrink-0 text-center text-sm font-bold px-1'
          maxLength={4}
          aria-label='Panel label'
        />
        <div className='flex-1 text-xs text-muted-foreground'>Panel {panel.label}</div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-6 px-2 text-[10px]'
          onClick={(): void => onSvgChange(BLANK_SQUARE_SVG)}
        >
          Start blank
        </Button>
        {canDelete ? (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-6 px-1 text-rose-400'
            onClick={onDelete}
            aria-label='Delete panel'
          >
            <Trash2 className='size-3' />
          </Button>
        ) : null}
      </div>

      {/* SVG code editor with instant preview */}
      <SvgCodeEditor
        value={panel.svgContent}
        onChange={onSvgChange}
        previewSize='sm'
        placeholder={`<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">\n  <!-- panel ${panel.label} -->\n</svg>`}
      />

      {/* Description / accessibility text */}
      <FormField label='Description (screen reader / tooltip)'>
        <Input
          value={panel.description ?? ''}
          onChange={(e): void => onDescChange(e.target.value)}
          placeholder='Optional text description'
          className='h-7 text-xs'
        />
      </FormField>
    </div>
  );
}

// ── Composite panel preview ───────────────────────────────────────────────────

function CompositePanelPreview({
  illustration,
}: {
  illustration: Extract<KangurQuestionIllustration, { type: 'panels' }>;
}): React.JSX.Element {
  const hasAnyContent = illustration.panels.some((p) => p.svgContent.trim().length > 0);
  if (!hasAnyContent) return <></>;

  return (
    <div className='rounded-xl border border-border/40 bg-white p-3 space-y-2'>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        Combined preview
      </div>
      <div
        className={cn(
          'gap-3',
          illustration.layout === 'row'
            ? 'flex flex-wrap'
            : illustration.layout === 'grid-2x2'
              ? 'grid grid-cols-2'
              : 'grid grid-cols-3'
        )}
      >
        {illustration.panels.map((panel) => (
          <div key={panel.id} className='space-y-1'>
            <div className='text-center text-[9px] font-bold text-gray-400'>{panel.label}</div>
            {panel.svgContent.trim() ? (
              <div
                className='flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-gray-100'
                /* admin-only preview */
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(panel.svgContent) }}
              />
            ) : (
              <div className='flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-gray-200'>
                <span className='text-[9px] text-gray-300'>empty</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  illustration: KangurQuestionIllustration;
  choices: KangurTestChoice[];
  onChange: (next: KangurQuestionIllustration) => void;
};

export function QuestionIllustrationEditor({
  illustration,
  choices,
  onChange,
}: Props): React.JSX.Element {
  const setType = (type: string): void => {
    if (type === 'none') {
      onChange({ type: 'none' });
    } else if (type === 'single') {
      onChange({ type: 'single', svgContent: '' });
    } else if (type === 'panels') {
      const labels = choices.map((c) => c.label);
      onChange(createPanelIllustration(Math.min(choices.length || 5, 5), labels));
    }
  };

  const updatePanel = useCallback(
    (panelId: string, updater: (p: KangurIllustrationPanel) => KangurIllustrationPanel): void => {
      if (illustration.type !== 'panels') return;
      onChange({
        ...illustration,
        panels: illustration.panels.map((p) => (p.id === panelId ? updater(p) : p)),
      });
    },
    [illustration, onChange]
  );

  const addPanel = (): void => {
    if (illustration.type !== 'panels') return;
    const label = String.fromCharCode(65 + illustration.panels.length);
    onChange({
      ...illustration,
      panels: [
        ...illustration.panels,
        { id: createPanelId(), label, svgContent: '', description: '' },
      ],
    });
  };

  const deletePanel = (panelId: string): void => {
    if (illustration.type !== 'panels' || illustration.panels.length <= 1) return;
    onChange({ ...illustration, panels: illustration.panels.filter((p) => p.id !== panelId) });
  };

  const syncLabelsToChoices = (): void => {
    if (illustration.type !== 'panels') return;
    onChange({
      ...illustration,
      panels: illustration.panels.map((p, i) => ({
        ...p,
        label: choices[i]?.label ?? p.label,
      })),
    });
  };

  const setPanelCount = (countStr: string): void => {
    if (illustration.type !== 'panels') return;
    const count = parseInt(countStr, 10);
    if (!Number.isFinite(count)) return;
    const labels = choices.map((c) => c.label);
    const current = illustration.panels;
    if (count > current.length) {
      const extra: KangurIllustrationPanel[] = Array.from(
        { length: count - current.length },
        (_, i) => ({
          id: createPanelId(),
          label: labels[current.length + i] ?? String.fromCharCode(65 + current.length + i),
          svgContent: '',
          description: '',
        })
      );
      onChange({ ...illustration, panels: [...current, ...extra] });
    } else {
      onChange({ ...illustration, panels: current.slice(0, count) });
    }
  };

  return (
    <div className='space-y-4'>
      {/* Type + layout controls */}
      <div className='flex flex-wrap items-center gap-3'>
        <div className='w-52'>
          <SelectSimple
            size='sm'
            value={illustration.type}
            onValueChange={setType}
            options={SVG_TYPE_OPTIONS}
            triggerClassName='h-9'
          />
        </div>
        {illustration.type === 'panels' ? (
          <>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground'>Panels:</span>
              <SelectSimple
                size='sm'
                value={String(illustration.panels.length)}
                onValueChange={setPanelCount}
                options={PANEL_COUNT_OPTIONS}
                triggerClassName='h-8 w-16'
              />
            </div>
            <div className='w-36'>
              <SelectSimple
                size='sm'
                value={illustration.layout}
                onValueChange={(v): void => {
                  if (illustration.type !== 'panels') return;
                  if (v !== 'row' && v !== 'grid-2x2' && v !== 'grid-3x2') return;
                  onChange({ ...illustration, layout: v });
                }}
                options={LAYOUT_OPTIONS}
                triggerClassName='h-8'
              />
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3 text-xs text-cyan-200'
              onClick={syncLabelsToChoices}
            >
              Sync labels to choices
            </Button>
          </>
        ) : null}
      </div>

      {/* No illustration */}
      {illustration.type === 'none' ? (
        <div className='rounded-xl border border-dashed border-border/60 bg-card/20 p-4 text-sm text-muted-foreground'>
          No illustration. Select Single SVG or Panels to add visual content.
        </div>
      ) : null}

      {/* Single SVG */}
      {illustration.type === 'single' ? (
        <SvgCodeEditor
          value={illustration.svgContent}
          onChange={(next): void => onChange({ ...illustration, svgContent: next })}
          previewSize='lg'
          placeholder='<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">\n  <!-- SVG content -->\n</svg>'
        />
      ) : null}

      {/* Panels */}
      {illustration.type === 'panels' ? (
        <div className='space-y-4'>
          <div
            className={cn(
              'gap-3',
              illustration.layout === 'row'
                ? 'flex flex-wrap'
                : illustration.layout === 'grid-2x2'
                  ? 'grid grid-cols-2'
                  : 'grid grid-cols-3'
            )}
          >
            {illustration.panels.map((panel) => (
              <div
                key={panel.id}
                className={cn(illustration.layout === 'row' ? 'min-w-[280px] flex-1' : '')}
              >
                <PanelEditor
                  panel={panel}
                  canDelete={illustration.panels.length > 1}
                  onSvgChange={(v): void =>
                    updatePanel(panel.id, (p) => ({ ...p, svgContent: v }))
                  }
                  onLabelChange={(v): void =>
                    updatePanel(panel.id, (p) => ({ ...p, label: v }))
                  }
                  onDescChange={(v): void =>
                    updatePanel(panel.id, (p) => ({ ...p, description: v }))
                  }
                  onDelete={(): void => deletePanel(panel.id)}
                />
              </div>
            ))}

            {illustration.panels.length < 8 ? (
              <div className='flex items-center justify-center'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-9 px-3'
                  onClick={addPanel}
                >
                  <Plus className='mr-1 size-3.5' />
                  Add panel
                </Button>
              </div>
            ) : null}
          </div>

          {/* Composite preview of all panels together */}
          <CompositePanelPreview illustration={illustration} />
        </div>
      ) : null}
    </div>
  );
}
