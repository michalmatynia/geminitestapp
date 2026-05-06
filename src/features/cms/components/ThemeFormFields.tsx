import React from 'react';
import { Input } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import type {
  CmsThemeColors,
  CmsThemeSpacing,
  CmsThemeTypography,
} from '@/shared/contracts/cms';

export interface ColorFieldProps {
  colors: CmsThemeColors;
  updateColor: (key: keyof CmsThemeColors, value: string) => void;
}

export function ColorFields({ colors, updateColor }: ColorFieldProps): React.JSX.Element {
  const colorKeys = Object.keys(colors) as Array<keyof CmsThemeColors>;
  return (
    <>
      {colorKeys.map((key) => (
        <FormField key={key} label={key} className='capitalize'>
          <div className='flex items-center gap-2'>
            <input
              type='color'
              value={colors[key]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateColor(key, e.target.value)
              }
              className='h-10 w-10 border-0 p-0 rounded'
              aria-label={`${key} color picker`}
              title={`${key} color picker`}
            />
            <Input
              value={colors[key]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateColor(key, e.target.value)
              }
              aria-label={`${key} color value`}
              title={`${key} color value`}
            />
          </div>
        </FormField>
      ))}
    </>
  );
}

type TypographyFieldsProps = {
  typography: CmsThemeTypography;
  setTypography: React.Dispatch<React.SetStateAction<CmsThemeTypography>>;
};

const TYPOGRAPHY_TEXT_FIELDS = [
  { key: 'headingFont', label: 'Heading Font' },
  { key: 'bodyFont', label: 'Body Font' },
] as const;

const TYPOGRAPHY_NUMBER_FIELDS = [
  { key: 'baseSize', label: 'Base Size (px)', props: {} },
  { key: 'headingWeight', label: 'Heading Weight', props: { min: 100, max: 900, step: 100 } },
  { key: 'bodyWeight', label: 'Body Weight', props: { min: 100, max: 900, step: 100 } },
] as const;

export function TypographyFields({
  typography,
  setTypography,
}: TypographyFieldsProps): React.JSX.Element {
  const updateText = (key: 'headingFont' | 'bodyFont', value: string): void =>
    setTypography((prev) => ({ ...prev, [key]: value }));
  const updateNumber = (key: 'baseSize' | 'headingWeight' | 'bodyWeight', value: string): void =>
    setTypography((prev) => ({ ...prev, [key]: Number(value) }));

  return (
    <>
      {TYPOGRAPHY_TEXT_FIELDS.map(({ key, label }) => (
        <FormField key={key} label={label}>
          <Input
            value={typography[key]}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              updateText(key, event.target.value)
            }
            aria-label={label}
            title={label}
          />
        </FormField>
      ))}
      {TYPOGRAPHY_NUMBER_FIELDS.map(({ key, label, props }) => (
        <FormField key={key} label={label} className={key === 'bodyWeight' ? 'col-span-1' : undefined}>
          <Input
            type='number'
            value={typography[key]}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              updateNumber(key, event.target.value)
            }
            aria-label={label}
            title={label}
            {...props}
          />
        </FormField>
      ))}
    </>
  );
}

type SpacingFieldsProps = {
  spacing: CmsThemeSpacing;
  setSpacing: React.Dispatch<React.SetStateAction<CmsThemeSpacing>>;
};

export function SpacingFields({
  spacing,
  setSpacing,
}: SpacingFieldsProps): React.JSX.Element {
  const updateSpacing = (
    key: keyof CmsThemeSpacing,
    value: string
  ): void => setSpacing((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <FormField label='Section Padding'>
        <Input
          value={spacing.sectionPadding}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            updateSpacing('sectionPadding', event.target.value)
          }
          aria-label='Section Padding'
          title='Section Padding'
        />
      </FormField>
      <FormField label='Container Max Width'>
        <Input
          value={spacing.containerMaxWidth}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            updateSpacing('containerMaxWidth', event.target.value)
          }
          aria-label='Container Max Width'
          title='Container Max Width'
        />
      </FormField>
    </>
  );
}
