'use client';

import { Plus, Trash2 } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { KangurQuestionIllustration } from '@/features/kangur/shared/contracts/kangur-tests';
import { Button, FormField, Input, SelectSimple } from '@/features/kangur/shared/ui';
import { cn, sanitizeSvg } from '@/features/kangur/shared/utils';

import { SvgCodeEditor } from './SvgCodeEditor';
import {
  KangurIllustrationPanelProvider,
  KangurQuestionIllustrationProvider,
  useKangurIllustrationPanelContext,
  useKangurQuestionIllustrationContext,
} from '../context/KangurQuestionIllustrationContext';

const SVG_TYPE_OPTIONS = [
  { value: 'none', label: 'No illustration' },
  { value: 'single', label: 'Single SVG' },
  { value: 'panels', label: 'Panels (A/B/C/D/E)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const LAYOUT_OPTIONS = [
  { value: 'row', label: 'Row' },
  { value: 'grid-2x2', label: '2×2 grid' },
  { value: 'grid-3x2', label: '3×2 grid' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const PANEL_COUNT_OPTIONS: Array<LabeledOptionDto<string>> = [2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: String(n),
}));

const BLANK_SQUARE_SVG =
  '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">\n  <rect x="5" y="5" width="50" height="50" fill="white" stroke="#374151" stroke-width="1.5"/>\n  <!-- 4×4 dashed grid -->\n  <line x1="15" y1="0" x2="15" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="30" y1="0" x2="30" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="45" y1="0" x2="45" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="15" x2="60" y2="15" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="30" x2="60" y2="30" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n  <line x1="0" y1="45" x2="60" y2="45" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>\n</svg>';

function PanelEditor(): React.JSX.Element {
  const { panel, canDelete, remove, setDescription, setLabel, setSvgContent } =
    useKangurIllustrationPanelContext();

  return (
    <div className='rounded-2xl border border-border/60 bg-card/30 p-3 space-y-3'>
      <div className='flex items-center gap-2'>
        <Input
          value={panel.label}
          onChange={(event): void => setLabel(event.target.value)}
          className='h-7 w-12 shrink-0 text-center text-sm font-bold px-1'
          maxLength={4}
          aria-label='Panel label'
         title='Input field'/>
        <div className='flex-1 text-xs text-muted-foreground'>Panel {panel.label}</div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-6 px-2 text-[10px]'
          onClick={(): void => setSvgContent(BLANK_SQUARE_SVG)}
        >
          Start blank
        </Button>
        {canDelete ? (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-6 px-1 text-rose-400'
            onClick={remove}
            aria-label='Delete panel'
            title={'Delete panel'}>
            <Trash2 className='size-3' />
          </Button>
        ) : null}
      </div>

      <SvgCodeEditor
        value={panel.svgContent}
        onChange={setSvgContent}
        previewSize='sm'
        placeholder={`<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">\n  <!-- panel ${panel.label} -->\n</svg>`}
      />

      <FormField label='Description (screen reader / tooltip)'>
        <Input
          value={panel.description ?? ''}
          onChange={(event): void => setDescription(event.target.value)}
          placeholder='Optional text description'
          className='h-7 text-xs'
         aria-label='Optional text description' title='Optional text description'/>
      </FormField>
    </div>
  );
}

function CompositePanelPreview(): React.JSX.Element {
  const { illustration } = useKangurQuestionIllustrationContext();
  if (illustration.type !== 'panels') return <></>;

  const hasAnyContent = illustration.panels.some((panel) => panel.svgContent.trim().length > 0);
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

function QuestionIllustrationEditorContent(): React.JSX.Element {
  const {
    illustration,
    addPanel,
    setLayout,
    setPanelCount,
    setSingleSvgContent,
    setType,
    syncLabelsToChoices,
  } = useKangurQuestionIllustrationContext();

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='w-52'>
          <SelectSimple
            size='sm'
            value={illustration.type}
            onValueChange={setType}
            options={SVG_TYPE_OPTIONS}
            triggerClassName='h-9'
           ariaLabel='Select option' title='Select option'/>
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
               ariaLabel='Select option' title='Select option'/>
            </div>
            <div className='w-36'>
              <SelectSimple
                size='sm'
                value={illustration.layout}
                onValueChange={(value): void => {
                  if (value !== 'row' && value !== 'grid-2x2' && value !== 'grid-3x2') return;
                  setLayout(value);
                }}
                options={LAYOUT_OPTIONS}
                triggerClassName='h-8'
               ariaLabel='Select option' title='Select option'/>
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

      {illustration.type === 'none' ? (
        <div className='rounded-xl border border-dashed border-border/60 bg-card/20 p-4 text-sm text-muted-foreground'>
          No illustration. Select Single SVG or Panels to add visual content.
        </div>
      ) : null}

      {illustration.type === 'single' ? (
        <SvgCodeEditor
          value={illustration.svgContent}
          onChange={setSingleSvgContent}
          previewSize='lg'
          placeholder='<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">\n  <!-- SVG content -->\n</svg>'
        />
      ) : null}

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
                <KangurIllustrationPanelProvider
                  panel={panel}
                  canDelete={illustration.panels.length > 1}
                >
                  <PanelEditor />
                </KangurIllustrationPanelProvider>
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

          <CompositePanelPreview />
        </div>
      ) : null}
    </div>
  );
}

export function QuestionIllustrationEditor(): React.JSX.Element {
  return (
    <KangurQuestionIllustrationProvider>
      <QuestionIllustrationEditorContent />
    </KangurQuestionIllustrationProvider>
  );
}

export type { KangurQuestionIllustration };
