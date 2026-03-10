'use client';

import { ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCmsThemes } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/shared/contracts/cms';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useUserPreferences, useUpdateUserPreferences } from '@/shared/hooks/useUserPreferences';
import { Button, SectionHeader, FormSection } from '@/shared/ui';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';

import { THEME_SECTIONS, toSectionId, SAVED_THEME_PREFIX } from './theme/theme-constants';
import { ThemeBrandSection } from './theme/ThemeBrandSection';
import { ThemeButtonsSection } from './theme/ThemeButtonsSection';
import {
  ThemeProductCardsSection,
  ThemeCollectionCardsSection,
  ThemeBlogCardsSection,
} from './theme/ThemeCardsSection';
import { ThemeColorsProvider } from './theme/ThemeColorsContext';
import { ThemeColorsSection } from './theme/ThemeColorsSection';
import { ThemeCustomCssSection } from './theme/ThemeCustomCssSection';
import { ThemeLayoutSection } from './theme/ThemeLayoutSection';
import { ThemeLogoSection } from './theme/ThemeLogoSection';
import { getFieldsForSection } from './theme/ThemeSettingsFields';
import { ThemeSocialSection } from './theme/ThemeSocialSection';
import { ThemeTypographySection } from './theme/ThemeTypographySection';
import { useThemeSettingsActions, useThemeSettingsValue } from './ThemeSettingsContext';

// ---------------------------------------------------------------------------
// Panel Content
// ---------------------------------------------------------------------------

function ThemeSettingsPanelContent({
  showHeader = true,
}: {
  showHeader?: boolean;
}): React.JSX.Element {
  const theme = useThemeSettingsValue();
  const { update } = useThemeSettingsActions();
  const themesQuery = useCmsThemes();
  const savedThemes = useMemo((): CmsTheme[] => themesQuery.data ?? [], [themesQuery.data]);

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
    return (): void => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const toggleSection = useCallback(
    (section: string): void => {
      setUserOpenSections((current: Set<string> | null): Set<string> => {
        const next = new Set(current ?? initialOpenSections);
        if (next.has(section)) {
          next.delete(section);
        } else {
          next.add(section);
        }
        return next;
      });
    },
    [initialOpenSections]
  );

  const themePresetOptions = useMemo(() => {
    return [
      { label: 'Default', value: 'default' },
      ...savedThemes.map((t) => ({
        label: `Theme: ${t.name}`,
        value: `${SAVED_THEME_PREFIX}${t.id}`,
      })),
    ];
  }, [savedThemes]);

  const applyThemePatch = useCallback(
    (values: Partial<ThemeSettings>): void => {
      (
        Object.entries(values) as Array<
          [keyof ThemeSettings, ThemeSettings[keyof ThemeSettings] | undefined]
        >
      ).forEach(([key, value]) => {
        if (value !== undefined) {
          update(key, value);
        }
      });
    },
    [update]
  );

  const renderSectionBody = useCallback<(section: string) => React.ReactNode>(
    (section: string): React.ReactNode => {
      switch (section) {
        case 'Logo':
          return <ThemeLogoSection />;

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
          return <ThemeBrandSection />;

        case 'Social Media':
          return <ThemeSocialSection />;

        case 'Custom CSS':
          return <ThemeCustomCssSection />;

        default: {
          const fields = getFieldsForSection(section, theme, themePresetOptions);
          if (fields.length > 0) {
            return (
              <SettingsFieldsRenderer fields={fields} values={theme} onChange={applyThemePatch} />
            );
          }
          return <div className='text-xs text-gray-500'>Settings coming soon.</div>;
        }
      }
    },
  [applyThemePatch, theme, themePresetOptions]
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
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${section}`}
                    title={`${isOpen ? 'Collapse' : 'Expand'} ${section}`}
                  >
                    <ChevronDown
                      className={`size-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                }
              >
                {isOpen && (
                  <div className='px-3 pb-3 border-t border-border/40 pt-3'>
                    {renderSectionBody(section)}
                  </div>
                )}
              </FormSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ThemeSettingsPanel({
  showHeader = true,
}: { showHeader?: boolean } = {}): React.JSX.Element {
  const shouldShowHeader = showHeader;

  return (
    <ThemeColorsProvider>
      <ThemeSettingsPanelContent showHeader={shouldShowHeader} />
    </ThemeColorsProvider>
  );
}
