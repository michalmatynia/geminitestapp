'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCmsThemes } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/shared/contracts/cms';
import type { ColorScheme, ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import {
  Button,
  Label,
  FileUploadButton,
  FileUploadTrigger,
  SectionHeader,
  Textarea,
  FormSection,
  Card,
  Hint,
} from '@/shared/ui';
import {
  SettingsField,
  SettingsFieldsRenderer,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { ImagePickerField } from './shared-fields';
import { MiniRichTextEditor } from './theme/MiniRichTextEditor';
import {
  THEME_SECTIONS,
  toSectionId,
  SAVED_THEME_PREFIX,
} from './theme/theme-constants';
import { ThemeButtonsSection } from './theme/ThemeButtonsSection';
import {
  ThemeProductCardsSection,
  ThemeCollectionCardsSection,
  ThemeBlogCardsSection,
} from './theme/ThemeCardsSection';
import { ThemeColorsProvider, useThemeColors } from './theme/ThemeColorsContext';
import { ThemeColorsSection } from './theme/ThemeColorsSection';
import { ThemeLayoutSection } from './theme/ThemeLayoutSection';
import { ThemeTypographySection } from './theme/ThemeTypographySection';
import { useThemeSettings } from './ThemeSettingsContext';

// ---------------------------------------------------------------------------
// Panel Content
// ---------------------------------------------------------------------------

function ThemeSettingsPanelContent({ showHeader = true }: { showHeader?: boolean }): React.JSX.Element {
  const { theme, update } = useThemeSettings();
  const { startAddScheme } = useThemeColors();
  const themesQuery = useCmsThemes();
  const savedThemes = useMemo((): CmsTheme[] => themesQuery.data ?? [], [themesQuery.data]);

  // Logo-specific state (file picker)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(180);
  const previewUrlRef = useRef<string | null>(null);

  // Accordion open-state persistence
  const hasHydratedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const preferencesQuery = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferences();

  const [userOpenSections, setUserOpenSections] = useState<Set<string> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  const initialOpenSections = useMemo((): Set<string> => {
    if (!preferencesQuery.isFetched) return new Set<string>();
    const saved = preferencesQuery.data?.cmsThemeOpenSections ?? [];
    const filtered = saved.filter((item: string): item is string => typeof item === 'string');
    return new Set(filtered);
  }, [preferencesQuery.data, preferencesQuery.isFetched]);

  const openSections = userOpenSections ?? initialOpenSections;

  useEffect((): void => {
    if (preferencesQuery.isFetched) {
      hasHydratedRef.current = true;
    }
  }, [preferencesQuery.isFetched]);

  const openSectionsArray = useMemo((): string[] => Array.from(openSections), [openSections]);

  useEffect((): void | (() => void) => {
    if (!hasHydratedRef.current || !userOpenSections) return;
    const nextSerialized = JSON.stringify(openSectionsArray);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updatePreferencesMutation.mutate({ cmsThemeOpenSections: openSectionsArray });
    }, 400);
  }, [openSectionsArray, userOpenSections, updatePreferencesMutation]);

  useEffect((): (() => void) => {
    return (): void => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); };
  }, []);

  useEffect((): (() => void) => {
    return (): void => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const section = typeof detail['section'] === 'string' ? (detail['section']) : 'Colors';
      setUserOpenSections((prev: Set<string> | null) => {
        const current = prev ?? initialOpenSections;
        const next = new Set(current);
        next.add(section);
        return next;
      });
      if (section === 'Colors' && detail['action'] === 'createScheme') {
        startAddScheme();
      }
      window.requestAnimationFrame((): void => {
        const target = document.getElementById(toSectionId(section));
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('cms-theme-open', handler as EventListener);
    return (): void => {
      window.removeEventListener('cms-theme-open', handler as EventListener);
    };
  }, [initialOpenSections, startAddScheme]);

  const handleLogoSelect = useCallback((files: File[]): void => {
    const file = files[0] ?? null;
    setLogoFile(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) {
      const nextUrl = URL.createObjectURL(file);
      previewUrlRef.current = nextUrl;
      setLogoPreviewUrl(nextUrl);
    } else {
      setLogoPreviewUrl(null);
    }
  }, []);

  const themePresetOptions = useMemo(() => {
    const presets = [
      { label: 'Default', value: 'default' },
      { label: 'Minimal', value: 'minimal' },
      { label: 'Bold', value: 'bold' },
      { label: 'Elegant', value: 'elegant' },
      { label: 'Playful', value: 'playful' },
    ];
    const saved = savedThemes.map((savedTheme: CmsTheme) => ({
      label: `Saved: ${savedTheme.name}`,
      value: `${SAVED_THEME_PREFIX}${savedTheme.id}`,
    }));
    return [...presets, ...saved];
  }, [savedThemes]);

  const toggleSection = useCallback((section: string): void => {
    setUserOpenSections((prev: Set<string> | null) => {
      const current = prev ?? initialOpenSections;
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, [initialOpenSections]);

  const updateSetting = useCallback(
    <K extends keyof ThemeSettings>(key: K): ((value: ThemeSettings[K]) => void) => {
      return (value: ThemeSettings[K]): void => {
        update(key, value);
      };
    },
    [update]
  );

  const getFieldsForSection = useCallback(
    (section: string): SettingsField<ThemeSettings>[] => {
      switch (section) {
        case 'Animations':
          return [
            { key: 'enableAnimations', label: 'Enable animations', type: 'checkbox' },
            ...(theme.enableAnimations ? [
              { key: 'animationDuration', label: 'Duration', type: 'range', min: 100, max: 1000, suffix: 'ms' },
              { key: 'animationEasing', label: 'Easing', type: 'select', options: [
                { label: 'Ease out', value: 'ease-out' },
                { label: 'Ease in-out', value: 'ease-in-out' },
                { label: 'Ease in', value: 'ease-in' },
                { label: 'Linear', value: 'linear' },
                { label: 'Spring', value: 'cubic-bezier(.68,-0.55,.27,1.55)' },
              ]},
              { key: 'scrollReveal', label: 'Reveal sections on scroll', type: 'checkbox' },
              { key: 'hoverEffect', label: 'Hover effect', type: 'select', options: [
                { label: 'Vertical lift', value: 'vertical-lift' },
                { label: '3D lift', value: 'lift-3d' },
              ]},
              { key: 'hoverScale', label: 'Hover scale', type: 'range', min: 1, max: 1.2, step: 0.01, suffix: 'x' },
            ] as SettingsField<ThemeSettings>[] : [])
          ];

        case 'Variant Pills':
          return [
            { key: 'pillRadius', label: 'Corner radius', type: 'number', min: 0, max: 999, suffix: 'px' },
            { key: 'pillPaddingX', label: 'Padding X', type: 'number', min: 4, max: 32, suffix: 'px' },
            { key: 'pillPaddingY', label: 'Padding Y', type: 'number', min: 2, max: 16, suffix: 'px' },
            { key: 'pillFontSize', label: 'Font size', type: 'number', min: 10, max: 18, suffix: 'px' },
            { key: 'pillBg', label: 'Background Color', type: 'color' },
            { key: 'pillText', label: 'Text Color', type: 'color' },
            { key: 'pillActiveBg', label: 'Active Background', type: 'color' },
            { key: 'pillActiveText', label: 'Active Text', type: 'color' },
            { key: 'pillBorderColor', label: 'Border Color', type: 'color' },
            { key: 'pillBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'pillBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'pillShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'pillShadowX', label: 'Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'pillShadowY', label: 'Shadow Y', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'pillShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
          ];

        case 'Inputs':
          return [
            { key: 'inputHeight', label: 'Height', type: 'number', min: 28, max: 56, suffix: 'px' },
            { key: 'inputFontSize', label: 'Font size', type: 'number', min: 10, max: 20, suffix: 'px' },
            { key: 'inputBg', label: 'Background Color', type: 'color' },
            { key: 'inputText', label: 'Text Color', type: 'color' },
            { key: 'inputFocusBorder', label: 'Focus border', type: 'color' },
            { key: 'inputPlaceholder', label: 'Placeholder Color', type: 'color' },
            { key: 'inputBorderColor', label: 'Border Color', type: 'color' },
            { key: 'inputBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'inputBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'inputRadius', label: 'Corner radius', type: 'number', min: 0, max: 24, suffix: 'px' },
            { key: 'inputShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'inputShadowX', label: 'Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'inputShadowY', label: 'Shadow Y', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'inputShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
          ];

        case 'Content Containers':
          return [
            { key: 'containerBg', label: 'Background Color', type: 'color' },
            { key: 'containerBorderColor', label: 'Border color', type: 'color' },
            { key: 'containerRadius', label: 'Radius', type: 'number', min: 0, max: 24, suffix: 'px' },
            { key: 'containerPaddingInner', label: 'Inner padding', type: 'number', min: 8, max: 64, suffix: 'px' },
            { key: 'containerShadow', label: 'Shadow', type: 'select', options: [
              { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
            ]},
            { key: 'containerBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'containerBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'containerBorderRadius', label: 'Border Corner radius', type: 'number', min: 0, max: 48, suffix: 'px' },
            { key: 'containerShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'containerShadowX', label: 'Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'containerShadowY', label: 'Shadow Y', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'containerShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
          ];

        case 'Media':
          return [
            { key: 'imagePlaceholderBg', label: 'Placeholder bg', type: 'color' },
            { key: 'videoRatio', label: 'Video ratio', type: 'select', options: [
              { label: '16:9', value: '16:9' }, { label: '4:3', value: '4:3' }, { label: '1:1', value: '1:1' }, { label: '9:16 Vertical', value: '9:16' },
            ]},
            { key: 'imageBorderColor', label: 'Border color', type: 'color' },
            { key: 'imageBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'imageBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'imageRadius', label: 'Corner radius', type: 'number', min: 0, max: 48, suffix: 'px' },
            { key: 'imageShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'imageShadowX', label: 'Shadow X', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'imageShadowY', label: 'Shadow Y', type: 'number', min: -20, max: 20, suffix: 'px' },
            { key: 'imageShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 40, suffix: 'px' },
          ];

        case 'Dropdowns and pop-ups':
          return [
            { key: 'dropdownBg', label: 'Dropdown bg', type: 'color' },
            { key: 'popupOverlayColor', label: 'Popup overlay', type: 'color' },
            { key: 'dropdownBorder', label: 'Border color', type: 'color' },
            { key: 'dropdownBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'dropdownBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'dropdownRadius', label: 'Dropdown radius', type: 'number', min: 0, max: 24, suffix: 'px' },
            { key: 'popupRadius', label: 'Popup radius', type: 'number', min: 0, max: 32, suffix: 'px' },
            { key: 'dropdownShadow', label: 'Shadow Preset', type: 'select', options: [
              { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
            ]},
            { key: 'dropdownShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'dropdownShadowX', label: 'Shadow X', type: 'number', min: -30, max: 30, suffix: 'px' },
            { key: 'dropdownShadowY', label: 'Shadow Y', type: 'number', min: -30, max: 30, suffix: 'px' },
            { key: 'dropdownShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
          ];

        case 'Drawers':
          return [
            { key: 'drawerWidth', label: 'Width', type: 'range', min: 280, max: 600, suffix: 'px' },
            { key: 'drawerBg', label: 'Background Color', type: 'color' },
            { key: 'drawerOverlayColor', label: 'Overlay Color', type: 'color' },
            { key: 'drawerPosition', label: 'Position', type: 'select', options: [
              { label: 'Right', value: 'right' }, { label: 'Left', value: 'left' },
            ]},
            { key: 'drawerBorderColor', label: 'Border color', type: 'color' },
            { key: 'drawerBorderWidth', label: 'Border Thickness', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'drawerBorderOpacity', label: 'Border Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'drawerRadius', label: 'Corner radius', type: 'number', min: 0, max: 32, suffix: 'px' },
            { key: 'drawerShadowOpacity', label: 'Shadow Opacity', type: 'range', min: 0, max: 100, suffix: '%' },
            { key: 'drawerShadowX', label: 'Shadow X', type: 'number', min: -30, max: 30, suffix: 'px' },
            { key: 'drawerShadowY', label: 'Shadow Y', type: 'number', min: -30, max: 30, suffix: 'px' },
            { key: 'drawerShadowBlur', label: 'Shadow Blur', type: 'number', min: 0, max: 60, suffix: 'px' },
          ];

        case 'Badges':
          return [
            { key: 'badgePosition', label: 'Position on cards', type: 'select', options: [
              { label: 'Top left', value: 'top-left' }, { label: 'Top right', value: 'top-right' }, { label: 'Bottom left', value: 'bottom-left' }, { label: 'Bottom right', value: 'bottom-right' },
            ]},
            { key: 'badgeRadius', label: 'Corner radius', type: 'range', min: 0, max: 40, suffix: 'px' },
            { key: 'badgeFontSize', label: 'Font size', type: 'number', min: 8, max: 16, suffix: 'px' },
            { key: 'badgePaddingX', label: 'Padding X', type: 'number', min: 2, max: 16, suffix: 'px' },
            { key: 'badgePaddingY', label: 'Padding Y', type: 'number', min: 0, max: 8, suffix: 'px' },
            { key: 'badgeSaleColorScheme', label: 'Sale color scheme', type: 'select', options: theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id })) },
            { key: 'badgeSoldOutColorScheme', label: 'Sold out color scheme', type: 'select', options: theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id })) },
            { key: 'badgeDefaultBg', label: 'Default Background', type: 'color' },
            { key: 'badgeDefaultText', label: 'Default Text', type: 'color' },
            { key: 'badgeSaleBg', label: 'Sale Background', type: 'color' },
            { key: 'badgeSaleText', label: 'Sale Text', type: 'color' },
          ];

        case 'Search Behaviour':
          return [
            { key: 'searchPlaceholder', label: 'Placeholder text', type: 'text' },
            { key: 'searchMinChars', label: 'Min characters', type: 'number', min: 1, max: 5 },
            { key: 'searchShowSuggestions', label: 'Enable search suggestions', type: 'checkbox' },
            ...(theme.searchShowSuggestions ? [
              { key: 'searchShowVendor', label: 'Show product vendor', type: 'checkbox' },
              { key: 'searchShowPrice', label: 'Show product price', type: 'checkbox' },
            ] as SettingsField<ThemeSettings>[] : []),
            { key: 'searchMaxResults', label: 'Max results', type: 'number', min: 3, max: 20 },
          ];

        case 'Currency Format':
          return [
            { key: 'currencyCode', label: 'Currency', type: 'select', options: [
              { label: 'USD ($)', value: 'USD' }, { label: 'EUR (\u20ac)', value: 'EUR' }, { label: 'GBP (\u00a3)', value: 'GBP' },
              { label: 'CAD (C$)', value: 'CAD' }, { label: 'AUD (A$)', value: 'AUD' }, { label: 'JPY (\u00a5)', value: 'JPY' },
            ]},
            { key: 'currencySymbol', label: 'Symbol', type: 'text' },
            { key: 'currencyPosition', label: 'Symbol position', type: 'select', options: [
              { label: 'Before ($10)', value: 'before' }, { label: 'After (10$)', value: 'after' },
            ]},
            { key: 'currencyShowCode', label: 'Show currency codes', type: 'checkbox' },
            { key: 'thousandsSeparator', label: 'Thousands separator', type: 'text' },
            { key: 'decimalSeparator', label: 'Decimal separator', type: 'text' },
            { key: 'decimalPlaces', label: 'Decimal places', type: 'number', min: 0, max: 4 },
          ];

        case 'Cart':
          return [
            { key: 'cartStyle', label: 'Cart type', type: 'select', options: [
              { label: 'Drawer', value: 'drawer' }, { label: 'Page', value: 'page' }, { label: 'Popup notification', value: 'dropdown' },
            ]},
            { key: 'cartIconStyle', label: 'Icon style', type: 'select', options: [
              { label: 'Bag', value: 'bag' }, { label: 'Cart', value: 'cart' }, { label: 'Basket', value: 'basket' },
            ]},
            { key: 'showCartCount', label: 'Show item count', type: 'checkbox' },
            { key: 'cartShowVendor', label: 'Show vendor', type: 'checkbox' },
            { key: 'cartEnableNote', label: 'Enable cart note', type: 'checkbox' },
            { key: 'cartEmptyText', label: 'Empty cart text', type: 'text' },
            ...(theme.cartStyle === 'drawer' ? [
              { key: 'cartDrawerShowWhenEmpty', label: 'Visible when cart drawer is empty', type: 'checkbox' },
              { key: 'cartDrawerColorScheme', label: 'Color scheme', type: 'select', options: theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id })) },
            ] as SettingsField<ThemeSettings>[] : [])
          ];

        case 'Theme Style':
          return [
            { key: 'themePreset', label: 'Preset', type: 'select', options: themePresetOptions },
            { key: 'darkMode', label: 'Dark mode', type: 'checkbox' },
          ];

        default:
          return [];
      }
    },
    [theme, themePresetOptions]
  );

  const renderSectionBody = useCallback<(section: string) => React.ReactNode>(
    (section: string): React.ReactNode => {
      switch (section) {
        case 'Logo':
          return (
            <div className='space-y-3'>
              <Card variant='subtle-compact' padding='sm' className='border-dashed border-border/50 bg-card/30'>
                <Hint size='xxs' uppercase className='font-semibold text-gray-500'>Logo preview</Hint>
                <div className='mt-3 flex items-center justify-center rounded border border-border/40 bg-card/50 p-4'>
                  {logoPreviewUrl ? (
                    <Image
                      src={logoPreviewUrl}
                      alt='Logo preview'
                      width={Math.max(1, logoWidth)}
                      height={Math.max(1, Math.round((logoWidth / 4) * 3))}
                      style={{ width: `${logoWidth}px`, height: 'auto' }}
                      className='h-auto max-w-full object-contain'
                    />
                  ) : (
                    <div className='text-xs text-gray-500'>No logo selected</div>
                  )}
                </div>
              </Card>
              <SettingsFieldsRenderer
                fields={[{ key: 'logoWidth', label: 'Desktop logo width', type: 'range', min: 50, max: 300, suffix: 'px' } as SettingsField<{ logoWidth: number }>]}
                values={{ logoWidth }}
                onChange={(vals) => setLogoWidth((vals as unknown as { logoWidth: number }).logoWidth)}
              />
              <div className='space-y-2'>
                <FileUploadTrigger
                  accept='image/*'
                  onFilesSelected={(files: File[]) => handleLogoSelect(files)}
                  asChild
                >
                  <Button
                    type='button'
                    variant='outline'
                    className='flex w-full items-center justify-center rounded border border-border/50 bg-card/30 px-3 py-3 text-xs font-medium text-gray-300 hover:bg-muted/40'
                  >
                    Image upload box
                  </Button>
                </FileUploadTrigger>
                <div className='flex items-center gap-2'>
                  <FileUploadButton size='sm' variant='outline' accept='image/*' onFilesSelected={(files: File[]) => handleLogoSelect(files)}>
                    Choose file
                  </FileUploadButton>
                  <span className='flex-1 truncate text-[11px] text-gray-500'>{logoFile?.name ?? 'No file selected'}</span>
                </div>
              </div>
            </div>
          );

        case 'Colors':
          return <ThemeColorsSection />;

        case 'Typography':
          return <ThemeTypographySection />;

        case 'Layout':
          return <ThemeLayoutSection />;

        case 'Buttons':
          return <ThemeButtonsSection />;

        case 'Product Cards':
          return <ThemeProductCardsSection />;

        case 'Collection Cards':
          return <ThemeCollectionCardsSection />;

        case 'Blog Cards':
          return <ThemeBlogCardsSection />;

        case 'Brand Information':
          return (
            <div className='space-y-4'>
              <SettingsFieldsRenderer
                fields={[
                  { key: 'brandName', label: 'Brand name', type: 'text', placeholder: 'Your brand' },
                  { key: 'brandTagline', label: 'Tagline', type: 'text', placeholder: 'Your tagline' },
                  { key: 'brandEmail', label: 'Email', type: 'email', placeholder: 'hello@example.com' },
                  { key: 'brandPhone', label: 'Phone', type: 'text', placeholder: '+1 234 567 890' },
                  { key: 'brandAddress', label: 'Address', type: 'text', placeholder: '123 Main St' },
                ]}
                values={theme}
                onChange={(values) => {
                  Object.entries(values).forEach(([key, value]) => {
                    update(key as keyof ThemeSettings, value as unknown as ThemeSettings[keyof ThemeSettings]);
                  });
                }}
              />
              <div className='border-t border-border/30 pt-2'>
                <Hint size='xxs' uppercase className='mb-2 block text-gray-500'>Footer description</Hint>
                <div className='space-y-3'>
                  <MiniRichTextEditor
                    label='Headline'
                    value={theme.brandFooterHeadline}
                    onChange={updateSetting('brandFooterHeadline')}
                    minHeight='70px'
                  />
                  <MiniRichTextEditor
                    label='Description'
                    value={theme.brandFooterDescription}
                    onChange={updateSetting('brandFooterDescription')}
                    minHeight='140px'
                    showFormatSelect
                    enableLists
                  />                  <ImagePickerField
                    label='Image'
                    value={theme.brandFooterImage}
                    onChange={updateSetting('brandFooterImage')}
                  />
                  <SettingsFieldsRenderer
                    fields={[{ key: 'brandFooterImageWidth', label: 'Image width', type: 'range', min: 50, max: 550, suffix: 'px' }]}
                    values={theme}
                    onChange={(values) => update('brandFooterImageWidth', values.brandFooterImageWidth as number)}
                  />
                </div>
              </div>
            </div>
          );

        case 'Social Media':
          return (
            <SettingsFieldsRenderer
              fields={[
                { key: 'socialFacebook', label: 'Facebook', type: 'text', placeholder: 'https://facebook.com/...' },
                { key: 'socialInstagram', label: 'Instagram', type: 'text', placeholder: 'https://instagram.com/...' },
                { key: 'socialYoutube', label: 'YouTube', type: 'text', placeholder: 'https://youtube.com/...' },
                { key: 'socialTiktok', label: 'TikTok', type: 'text', placeholder: 'https://tiktok.com/...' },
                { key: 'socialTwitter', label: 'X / Twitter', type: 'text', placeholder: 'https://x.com/...' },
                { key: 'socialSnapchat', label: 'Snapchat', type: 'text', placeholder: 'https://snapchat.com/add/...' },
                { key: 'socialPinterest', label: 'Pinterest', type: 'text', placeholder: 'https://pinterest.com/...' },
                { key: 'socialTumblr', label: 'Tumblr', type: 'text', placeholder: 'https://tumblr.com/...' },
                { key: 'socialVimeo', label: 'Vimeo', type: 'text', placeholder: 'https://vimeo.com/...' },
                { key: 'socialLinkedin', label: 'LinkedIn', type: 'text', placeholder: 'https://linkedin.com/...' },
              ]}
              values={theme}
              onChange={(values) => {
                Object.entries(values).forEach(([key, value]) => {
                  update(key as keyof ThemeSettings, value as unknown as ThemeSettings[keyof ThemeSettings]);
                });
              }}
            />
          );

        case 'Custom CSS':
          return (
            <div className='space-y-4'>
              <SettingsFieldsRenderer
                fields={[{ key: 'customCssSelectors', label: 'CSS selectors', type: 'text', placeholder: '.product-card, #cart, .footer' }]}
                values={theme}
                onChange={(values) => update('customCssSelectors', values.customCssSelectors as string)}
              />
              <div className='space-y-1.5'>
                <Label className='text-xs text-gray-400'>CSS Code</Label>
                <Textarea
                  value={theme.customCss}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('customCss', e.target.value)}
                  placeholder={'.my-class {\n  color: red;\n}'}
                  className='w-full bg-card/40 p-2 font-mono text-xs text-gray-300 placeholder:text-gray-600 min-h-[120px]'
                  spellCheck={false}
                />
              </div>
            </div>
          );

        default: {
          const fields = getFieldsForSection(section);
          if (fields.length > 0) {
            return (
              <SettingsFieldsRenderer
                fields={fields}
                values={theme}
                onChange={(values) => {
                  Object.entries(values).forEach(([key, value]) => {
                    update(key as keyof ThemeSettings, value as unknown as ThemeSettings[keyof ThemeSettings]);
                  });
                }}
              />
            );
          }
          return <div className='text-xs text-gray-500'>Settings coming soon.</div>;
        }
      }
    },
  [
    theme,
    update,
    updateSetting,
    logoPreviewUrl,
    logoWidth,
    logoFile?.name,
    handleLogoSelect,
    getFieldsForSection,
    toggleSection
  ]
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {showHeader && (
        <SectionHeader
          title='Theme settings'
          subtitle='Configure global styles and storefront components.'
          size='xs'
          className='p-3 border-b border-border'
        />
      )}
      <div className='flex-1 overflow-y-auto p-3'>
        <div className='space-y-3'>
          {THEME_SECTIONS.map((section: string): React.JSX.Element => {
            const isOpen = openSections.has(section);
            return (
              <FormSection
                key={section}
                id={toSectionId(section)}
                title={section}
                variant='subtle'
                className='p-0 overflow-hidden'
                actions={
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={(): void => toggleSection(section)}
                    className='h-8 w-8 p-0'
                  >
                    <ChevronDown className={`size-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                }
              >
                {isOpen && (
                  <div className='px-3 pb-3 border-t border-border/40 pt-3'>{renderSectionBody(section)}</div>
                )}
              </FormSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ThemeSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.JSX.Element {
  return (
    <ThemeColorsProvider>
      <ThemeSettingsPanelContent showHeader={showHeader} />
    </ThemeColorsProvider>
  );
}
