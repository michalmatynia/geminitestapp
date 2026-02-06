'use client';

import React from 'react';

import type { ColorScheme, ThemeSettings } from '@/features/cms/types/theme-settings';
import { Label } from '@/shared/ui';

import {
  CheckboxField,
  ColorField,
  NumberField,
  RangeField,
  SelectField,
} from '../shared-fields';

export function ThemeProductCardsSection({
  theme,
  update,
  updateSetting,
}: {
  theme: ThemeSettings;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  updateSetting: <K extends keyof ThemeSettings>(key: K) => (value: ThemeSettings[K]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={theme.cardStyle} onChange={updateSetting('cardStyle')} options={[
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ]} />
      <SelectField label="Image ratio" value={theme.cardImageRatio} onChange={updateSetting('cardImageRatio')} options={[
        { label: '1:1 Square', value: '1:1' },
        { label: '3:4 Portrait', value: '3:4' },
        { label: '4:3 Landscape', value: '4:3' },
        { label: '16:9 Wide', value: '16:9' },
      ]} />
      <RangeField label="Image padding" value={theme.cardImagePadding} onChange={updateSetting('cardImagePadding')} min={0} max={20} suffix="px" />
      <SelectField label="Text alignment" value={theme.cardTextAlignment} onChange={updateSetting('cardTextAlignment')} options={[
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ]} />
      <SelectField label="Color scheme" value={theme.cardColorScheme} onChange={(v: string): void => update('cardColorScheme', v)} options={
        theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
      } />
      <NumberField label="Radius" value={theme.cardRadius} onChange={updateSetting('cardRadius')} suffix="px" min={0} max={24} />
      <ColorField label="Background" value={theme.cardBg} onChange={updateSetting('cardBg')} />
      <SelectField label="Shadow" value={theme.cardShadow} onChange={updateSetting('cardShadow')} options={[
        { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
      ]} />
      <SelectField label="Hover shadow" value={theme.cardHoverShadow} onChange={updateSetting('cardHoverShadow')} options={[
        { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
      ]} />
      <CheckboxField label="Show badge" checked={theme.showBadge} onChange={updateSetting('showBadge')} />
      <CheckboxField label="Show quick-add button" checked={theme.showQuickAdd} onChange={updateSetting('showQuickAdd')} />
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
        <div className="space-y-2">
          <NumberField label="Thickness" value={theme.cardBorderWidth} onChange={updateSetting('cardBorderWidth')} suffix="px" min={0} max={8} />
          <RangeField label="Opacity" value={theme.cardBorderOpacity} onChange={updateSetting('cardBorderOpacity')} min={0} max={100} suffix="%" />
          <NumberField label="Corner radius" value={theme.cardBorderRadius} onChange={updateSetting('cardBorderRadius')} suffix="px" min={0} max={48} />
        </div>
      </div>
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
        <div className="space-y-2">
          <RangeField label="Opacity" value={theme.cardShadowOpacity} onChange={updateSetting('cardShadowOpacity')} min={0} max={100} suffix="%" />
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Horizontal" value={theme.cardShadowX} onChange={updateSetting('cardShadowX')} suffix="px" min={-20} max={20} />
            <NumberField label="Vertical" value={theme.cardShadowY} onChange={updateSetting('cardShadowY')} suffix="px" min={-20} max={20} />
            <NumberField label="Blur" value={theme.cardShadowBlur} onChange={updateSetting('cardShadowBlur')} suffix="px" min={0} max={40} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeCollectionCardsSection({
  theme,
  update,
  updateSetting,
}: {
  theme: ThemeSettings;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  updateSetting: <K extends keyof ThemeSettings>(key: K) => (value: ThemeSettings[K]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={theme.collectionStyle} onChange={updateSetting('collectionStyle')} options={[
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ]} />
      <SelectField label="Image ratio" value={theme.collectionRatio} onChange={updateSetting('collectionRatio')} options={[
        { label: '1:1 Square', value: '1:1' }, { label: '3:4 Portrait', value: '3:4' }, { label: '4:3 Landscape', value: '4:3' }, { label: '16:9 Wide', value: '16:9' },
      ]} />
      <RangeField label="Image padding" value={theme.collectionImagePadding} onChange={updateSetting('collectionImagePadding')} min={0} max={20} suffix="px" />
      <SelectField label="Text alignment" value={theme.collectionTextAlign} onChange={updateSetting('collectionTextAlign')} options={[
        { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' },
      ]} />
      <SelectField label="Color scheme" value={theme.collectionColorScheme} onChange={(v: string): void => update('collectionColorScheme', v)} options={
        theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
      } />
      <CheckboxField label="Show overlay" checked={theme.collectionOverlay} onChange={updateSetting('collectionOverlay')} />
      {theme.collectionOverlay && (
        <ColorField label="Overlay color" value={theme.collectionOverlayColor} onChange={updateSetting('collectionOverlayColor')} />
      )}
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
        <div className="space-y-2">
          <NumberField label="Thickness" value={theme.collectionBorderWidth} onChange={updateSetting('collectionBorderWidth')} suffix="px" min={0} max={8} />
          <RangeField label="Opacity" value={theme.collectionBorderOpacity} onChange={updateSetting('collectionBorderOpacity')} min={0} max={100} suffix="%" />
          <NumberField label="Corner radius" value={theme.collectionRadius} onChange={updateSetting('collectionRadius')} suffix="px" min={0} max={24} />
        </div>
      </div>
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
        <div className="space-y-2">
          <RangeField label="Opacity" value={theme.collectionShadowOpacity} onChange={updateSetting('collectionShadowOpacity')} min={0} max={100} suffix="%" />
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Horizontal" value={theme.collectionShadowX} onChange={updateSetting('collectionShadowX')} suffix="px" min={-20} max={20} />
            <NumberField label="Vertical" value={theme.collectionShadowY} onChange={updateSetting('collectionShadowY')} suffix="px" min={-20} max={20} />
            <NumberField label="Blur" value={theme.collectionShadowBlur} onChange={updateSetting('collectionShadowBlur')} suffix="px" min={0} max={40} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeBlogCardsSection({
  theme,
  update,
  updateSetting,
}: {
  theme: ThemeSettings;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  updateSetting: <K extends keyof ThemeSettings>(key: K) => (value: ThemeSettings[K]) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <SelectField label="Style" value={theme.blogStyle} onChange={updateSetting('blogStyle')} options={[
        { label: 'Standard', value: 'standard' },
        { label: 'Card', value: 'card' },
      ]} />
      <SelectField label="Image ratio" value={theme.blogRatio} onChange={updateSetting('blogRatio')} options={[
        { label: '1:1 Square', value: '1:1' }, { label: '3:4 Portrait', value: '3:4' }, { label: '4:3 Landscape', value: '4:3' }, { label: '16:9 Wide', value: '16:9' },
      ]} />
      <RangeField label="Image padding" value={theme.blogImagePadding} onChange={updateSetting('blogImagePadding')} min={0} max={20} suffix="px" />
      <SelectField label="Text alignment" value={theme.blogTextAlignment} onChange={updateSetting('blogTextAlignment')} options={[
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ]} />
      <SelectField label="Color scheme" value={theme.blogColorScheme} onChange={(v: string): void => update('blogColorScheme', v)} options={
        theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
      } />
      <NumberField label="Radius" value={theme.blogRadius} onChange={updateSetting('blogRadius')} suffix="px" min={0} max={24} />
      <CheckboxField label="Show date" checked={theme.blogShowDate} onChange={updateSetting('blogShowDate')} />
      <CheckboxField label="Show excerpt" checked={theme.blogShowExcerpt} onChange={updateSetting('blogShowExcerpt')} />
      {theme.blogShowExcerpt && (
        <NumberField label="Excerpt lines" value={theme.blogExcerptLines} onChange={updateSetting('blogExcerptLines')} min={1} max={5} />
      )}
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
        <div className="space-y-2">
          <NumberField label="Thickness" value={theme.blogBorderWidth} onChange={updateSetting('blogBorderWidth')} suffix="px" min={0} max={8} />
          <RangeField label="Opacity" value={theme.blogBorderOpacity} onChange={updateSetting('blogBorderOpacity')} min={0} max={100} suffix="%" />
          <NumberField label="Corner radius" value={theme.blogBorderRadius} onChange={updateSetting('blogBorderRadius')} suffix="px" min={0} max={48} />
        </div>
      </div>
      <div className="border-t border-border/30 pt-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
        <div className="space-y-2">
          <RangeField label="Opacity" value={theme.blogShadowOpacity} onChange={updateSetting('blogShadowOpacity')} min={0} max={100} suffix="%" />
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="Horizontal" value={theme.blogShadowX} onChange={updateSetting('blogShadowX')} suffix="px" min={-20} max={20} />
            <NumberField label="Vertical" value={theme.blogShadowY} onChange={updateSetting('blogShadowY')} suffix="px" min={-20} max={20} />
            <NumberField label="Blur" value={theme.blogShadowBlur} onChange={updateSetting('blogShadowBlur')} suffix="px" min={0} max={40} />
          </div>
        </div>
      </div>
    </div>
  );
}
