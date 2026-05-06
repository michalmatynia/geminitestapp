import { useState, type Dispatch, type SetStateAction } from 'react';
import type { CmsThemeColors, CmsThemeTypography, CmsThemeSpacing } from '@/shared/contracts/cms';

type ThemeFormInitialData = {
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
};

type ThemeFormState = {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  colors: CmsThemeColors;
  setColors: Dispatch<SetStateAction<CmsThemeColors>>;
  typography: CmsThemeTypography;
  setTypography: Dispatch<SetStateAction<CmsThemeTypography>>;
  spacing: CmsThemeSpacing;
  setSpacing: Dispatch<SetStateAction<CmsThemeSpacing>>;
  updateColor: (key: keyof CmsThemeColors, value: string) => void;
};

export const DEFAULT_COLORS: CmsThemeColors = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  accent: '#f59e0b',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
};

export const DEFAULT_TYPOGRAPHY: CmsThemeTypography = {
  headingFont: 'Inter, sans-serif',
  bodyFont: 'Inter, sans-serif',
  baseSize: 16,
  headingWeight: 700,
  bodyWeight: 400,
};

export const DEFAULT_SPACING: CmsThemeSpacing = {
  sectionPadding: '64px',
  containerMaxWidth: '1200px',
};

const resolveInitialThemeFormData = (
  initialData?: ThemeFormInitialData
): ThemeFormInitialData => initialData ?? {
  name: '',
  colors: DEFAULT_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
  spacing: DEFAULT_SPACING,
};

export function useThemeForm(initialData?: ThemeFormInitialData): ThemeFormState {
  const initial = resolveInitialThemeFormData(initialData);
  const [name, setName] = useState(initial.name);
  const [colors, setColors] = useState<CmsThemeColors>(initial.colors);
  const [typography, setTypography] = useState<CmsThemeTypography>(initial.typography);
  const [spacing, setSpacing] = useState<CmsThemeSpacing>(initial.spacing);

  const updateColor = (key: keyof CmsThemeColors, value: string): void => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  return {
    name,
    setName,
    colors,
    setColors,
    typography,
    setTypography,
    spacing,
    setSpacing,
    updateColor,
  };
}
