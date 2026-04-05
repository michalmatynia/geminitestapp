'use client';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CmsDomain } from '@/shared/contracts/cms';
import {
  CMS_MENU_SETTINGS_KEY,
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsKey,
  type MenuItem,
  type MenuSettings,
  normalizeMenuSettings,
} from '@/shared/contracts/cms-menu';
import type { ColorScheme } from '@/shared/contracts/cms-theme';
import { ANIMATION_PRESETS } from '@/shared/contracts/gsap';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Input, Button } from '@/shared/ui/primitives.public';
import { SelectSimple, FormSection } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';
import { SettingsFieldsRenderer } from '@/shared/ui/templates/SettingsPanelBuilder';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { useThemeSettingsValue } from './ThemeSettingsContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const MENU_SECTIONS = [
  'Visibility & Placement',
  'Menu Layout',
  'Menu Items',
  'Menu Images',
  'Typography',
  'Colors',
  'Spacing',
  'Mobile Menu',
  'Dropdown Style',
  'Sticky Behaviour',
  'Active State',
  'Hover Effects',
  'Animations',
];

const COLOR_SCHEME_FALLBACK: ReadonlyArray<LabeledOptionDto<string>> = [
  { label: 'Custom colors', value: 'custom' },
];

const FONT_FAMILY_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Bebas Neue', value: '\'Bebas Neue\', sans-serif' },
  { label: 'Space Grotesk', value: '\'Space Grotesk\', sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '\'Plus Jakarta Sans\', sans-serif' },
  { label: 'DM Sans', value: '\'DM Sans\', sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '\'Times New Roman\', serif' },
  { label: 'Courier New', value: '\'Courier New\', monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '\'Trebuchet MS\', sans-serif' },
  { label: 'Palatino', value: '\'Palatino Linotype\', serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const FONT_WEIGHT_OPTIONS = [
  { label: '100 – Thin', value: '100' },
  { label: '200 – Extra Light', value: '200' },
  { label: '300 – Light', value: '300' },
  { label: '400 – Normal', value: '400' },
  { label: '500 – Medium', value: '500' },
  { label: '600 – Semi Bold', value: '600' },
  { label: '700 – Bold', value: '700' },
  { label: '800 – Extra Bold', value: '800' },
  { label: '900 – Black', value: '900' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const MENU_PLACEMENT_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const MENU_LAYOUT_OPTIONS = [
  { label: 'Horizontal', value: 'horizontal' },
  { label: 'Vertical', value: 'vertical' },
  { label: 'Centered', value: 'centered' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const MENU_ALIGNMENT_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Space between', value: 'space-between' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const TEXT_TRANSFORM_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Capitalize', value: 'capitalize' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const MOBILE_BREAKPOINT_OPTIONS = [
  { label: '768px (Tablet)', value: '768' },
  { label: '1024px (Small desktop)', value: '1024' },
  { label: '1280px (Large desktop)', value: '1280' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const MOBILE_ANIMATION_OPTIONS = [
  { label: 'Slide left', value: 'slide-left' },
  { label: 'Slide right', value: 'slide-right' },
  { label: 'Slide down', value: 'slide-down' },
  { label: 'Fade', value: 'fade' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const DROPDOWN_SHADOW_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const POSITION_MODE_OPTIONS = [
  { label: 'Glued to top', value: 'sticky' },
  { label: 'Top of page', value: 'static' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const ACTIVE_STYLE_OPTIONS = [
  { label: 'Underline', value: 'underline' },
  { label: 'Bold', value: 'bold' },
  { label: 'Background', value: 'background' },
  { label: 'Border bottom', value: 'border-bottom' },
  { label: 'None', value: 'none' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const HOVER_STYLE_OPTIONS = [
  { label: 'Underline', value: 'underline' },
  { label: 'Color shift', value: 'color-shift' },
  { label: 'Background', value: 'background' },
  { label: 'Scale', value: 'scale' },
  { label: 'None', value: 'none' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MenuSettingsPanel({
  showHeader = true,
}: { showHeader?: boolean } = {}): React.JSX.Element {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const theme = useThemeSettingsValue();
  const { domains, activeDomainId, zoningEnabled } = useCmsDomainSelection();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const hasHydratedRef = useRef(false);
  const loadedKeyRef = useRef<string | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  const initialMenuScopeId = useMemo((): string => {
    if (!zoningEnabled) return 'default';
    return activeDomainId || 'default';
  }, [zoningEnabled, activeDomainId]);

  const [userMenuScopeId, setUserMenuScopeId] = useState<string | null>(null);
  const menuScopeId = useMemo((): string => {
    if (!zoningEnabled) return 'default';
    return userMenuScopeId ?? initialMenuScopeId;
  }, [initialMenuScopeId, userMenuScopeId, zoningEnabled]);
  const menuScopeOptions = useMemo<Array<LabeledOptionWithDescriptionDto<string>>>(() => {
    const options: Array<LabeledOptionWithDescriptionDto<string>> = [
      { value: 'default', label: 'Default scope' },
    ];
    domains.forEach((domain: CmsDomain) => {
      options.push({
        value: domain.id,
        label: domain.domain,
        description: domain.id === activeDomainId ? 'active' : undefined,
      });
    });
    return options;
  }, [activeDomainId, domains]);

  const menuKey = useMemo((): string => {
    if (!zoningEnabled) return CMS_MENU_SETTINGS_KEY;
    if (!menuScopeId || menuScopeId === 'default') return CMS_MENU_SETTINGS_KEY;
    return getCmsMenuSettingsKey(menuScopeId);
  }, [menuScopeId, zoningEnabled]);

  const settingsReady = !settingsStore.isLoading && !settingsStore.error;
  const menuSettingsRaw = settingsStore.get(menuKey);

  const initialSettings = useMemo((): MenuSettings => {
    if (!settingsReady) return DEFAULT_MENU_SETTINGS;
    const stored = parseJsonSetting<unknown>(menuSettingsRaw, null);
    return normalizeMenuSettings(stored);
  }, [settingsReady, menuSettingsRaw]);

  const [userSettings, setUserSettings] = useState<MenuSettings | null>(null);
  const settings = userSettings ?? initialSettings;

  const colorSchemeOptions = useMemo((): Array<LabeledOptionDto<string>> => {
    const options = [...COLOR_SCHEME_FALLBACK];
    const schemes: ColorScheme[] = theme?.colorSchemes ?? [];
    schemes.forEach((scheme: ColorScheme) => {
      if (!scheme?.id) return;
      options.push({ label: scheme.name || scheme.id, value: scheme.id });
    });
    return options;
  }, [theme?.colorSchemes]);

  const availableColorSchemeIds = useMemo((): Set<string> => {
    return new Set((theme?.colorSchemes ?? []).map((scheme: ColorScheme) => scheme.id));
  }, [theme?.colorSchemes]);

  const menuColorSchemeId = useMemo((): string => {
    if (settings.menuColorSchemeId === 'custom') return 'custom';
    return availableColorSchemeIds.has(settings.menuColorSchemeId)
      ? settings.menuColorSchemeId
      : 'custom';
  }, [availableColorSchemeIds, settings.menuColorSchemeId]);

  const hasScopedMenu = useMemo((): boolean => {
    if (!zoningEnabled) return false;
    if (menuKey === CMS_MENU_SETTINGS_KEY) return false;
    return settingsStore.map.has(menuKey);
  }, [menuKey, settingsStore.map, zoningEnabled]);

  const addMenuItem = useCallback((): void => {
    setUserSettings((prev: MenuSettings | null) => {
      const current = prev ?? initialSettings;
      return {
        ...current,
        items: [
          ...current.items,
          { id: String(Date.now()), label: 'New link', url: '/', imageUrl: '' },
        ],
      };
    });
  }, [initialSettings]);

  const updateMenuItem = useCallback(
    (id: string, field: 'label' | 'url' | 'imageUrl', value: string): void => {
      setUserSettings((prev: MenuSettings | null) => {
        const current = prev ?? initialSettings;
        return {
          ...current,
          items: current.items.map((item: MenuItem) =>
            item.id === id ? { ...item, [field]: value } : item
          ),
        };
      });
    },
    [initialSettings]
  );

  const removeMenuItem = useCallback(
    (id: string): void => {
      setUserSettings((prev: MenuSettings | null) => {
        const current = prev ?? initialSettings;
        return {
          ...current,
          items: current.items.filter((item: MenuItem) => item.id !== id),
        };
      });
    },
    [initialSettings]
  );

  const getFieldsForSection = useCallback(
    (section: string): SettingsPanelField<MenuSettings>[] => {
      switch (section) {
        case 'Visibility & Placement':
          return [
            { key: 'showMenu', label: 'Show menu', type: 'checkbox' },
            {
              key: 'menuPlacement',
              label: 'Menu position',
              type: 'select',
              options: MENU_PLACEMENT_OPTIONS,
            },
            { key: 'collapsible', label: 'Collapsible menu', type: 'checkbox' },
            ...(settings.collapsible
              ? [
                  {
                    key: 'collapsedByDefault',
                    label: 'Collapsed by default',
                    type: 'checkbox',
                  } as SettingsPanelField<MenuSettings>,
              ]
              : []),
            ...(settings.menuPlacement === 'left' || settings.menuPlacement === 'right'
              ? [
                  {
                    key: 'sideWidth',
                    label: 'Side width',
                    type: 'range',
                    min: 160,
                    max: 420,
                    suffix: 'px',
                  } as SettingsPanelField<MenuSettings>,
              ]
              : []),
            ...(settings.collapsible
              ? [
                  {
                    key: 'collapsedWidth',
                    label: 'Collapsed width',
                    type: 'range',
                    min: 48,
                    max: 120,
                    suffix: 'px',
                  } as SettingsPanelField<MenuSettings>,
              ]
              : []),
          ];

        case 'Menu Layout':
          return [
            {
              key: 'layoutStyle',
              label: 'Layout style',
              type: 'select',
              options: MENU_LAYOUT_OPTIONS,
            },
            {
              key: 'alignment',
              label: 'Alignment',
              type: 'select',
              options: MENU_ALIGNMENT_OPTIONS,
            },
            {
              key: 'maxWidth',
              label: 'Max width',
              type: 'range',
              min: 800,
              max: 1400,
              suffix: 'px',
            },
            { key: 'fullWidth', label: 'Full width', type: 'checkbox' },
          ];

        case 'Menu Images':
          return [
            { key: 'showItemImages', label: 'Show item images', type: 'checkbox' },
            ...(settings.showItemImages
              ? [
                  {
                    key: 'itemImageSize',
                    label: 'Image size',
                    type: 'range',
                    min: 12,
                    max: 48,
                    suffix: 'px',
                  } as SettingsPanelField<MenuSettings>,
              ]
              : []),
          ];

        case 'Typography':
          return [
            {
              key: 'fontFamily',
              label: 'Font family',
              type: 'select',
              options: FONT_FAMILY_OPTIONS,
            },
            {
              key: 'fontSize',
              label: 'Font size',
              type: 'number',
              min: 10,
              max: 32,
              suffix: 'px',
            },
            {
              key: 'fontWeight',
              label: 'Font weight',
              type: 'select',
              options: FONT_WEIGHT_OPTIONS,
            },
            {
              key: 'letterSpacing',
              label: 'Letter spacing',
              type: 'number',
              min: -2,
              max: 10,
              step: 0.1,
              suffix: 'px',
            },
            {
              key: 'textTransform',
              label: 'Text transform',
              type: 'select',
              options: TEXT_TRANSFORM_OPTIONS,
            },
          ];

        case 'Colors':
          return [
            {
              key: 'menuColorSchemeId',
              label: 'Color scheme',
              type: 'select',
              options: colorSchemeOptions,
            },
            ...(menuColorSchemeId === 'custom'
              ? ([
                { key: 'backgroundColor', label: 'Background', type: 'color' },
                { key: 'textColor', label: 'Text color', type: 'color' },
                { key: 'activeItemColor', label: 'Active item', type: 'color' },
                { key: 'borderColor', label: 'Border', type: 'color' },
              ] as SettingsPanelField<MenuSettings>[])
              : []),
          ];

        case 'Spacing':
          return [
            {
              key: 'paddingTop',
              label: 'Padding Top',
              type: 'number',
              min: 0,
              max: 100,
              suffix: 'px',
            },
            {
              key: 'paddingRight',
              label: 'Padding Right',
              type: 'number',
              min: 0,
              max: 100,
              suffix: 'px',
            },
            {
              key: 'paddingBottom',
              label: 'Padding Bottom',
              type: 'number',
              min: 0,
              max: 100,
              suffix: 'px',
            },
            {
              key: 'paddingLeft',
              label: 'Padding Left',
              type: 'number',
              min: 0,
              max: 100,
              suffix: 'px',
            },
            {
              key: 'itemGap',
              label: 'Item gap',
              type: 'range',
              min: 0,
              max: 40,
              suffix: 'px',
            },
          ];

        case 'Mobile Menu':
          return [
            {
              key: 'mobileBreakpoint',
              label: 'Breakpoint',
              type: 'select',
              options: MOBILE_BREAKPOINT_OPTIONS,
            },
            {
              key: 'mobileAnimation',
              label: 'Animation',
              type: 'select',
              options: MOBILE_ANIMATION_OPTIONS,
            },
            { key: 'hamburgerColor', label: 'Hamburger color', type: 'color' },
            { key: 'mobileOverlay', label: 'Show overlay', type: 'checkbox' },
          ];

        case 'Dropdown Style':
          return [
            { key: 'dropdownBg', label: 'Background', type: 'color' },
            { key: 'dropdownTextColor', label: 'Text color', type: 'color' },
            {
              key: 'dropdownRadius',
              label: 'Border radius',
              type: 'number',
              min: 0,
              max: 24,
              suffix: 'px',
            },
            {
              key: 'dropdownShadow',
              label: 'Shadow',
              type: 'select',
              options: DROPDOWN_SHADOW_OPTIONS,
            },
            {
              key: 'dropdownMinWidth',
              label: 'Min width',
              type: 'number',
              min: 100,
              max: 400,
              suffix: 'px',
            },
          ];

        case 'Sticky Behaviour': {
          const isSticky = settings.positionMode === 'sticky';
          const canHideOnScroll =
            isSticky || settings.menuPlacement === 'left' || settings.menuPlacement === 'right';

          return [
            {
              key: 'positionMode',
              label: 'Menu position',
              type: 'select',
              options: POSITION_MODE_OPTIONS,
            },
            ...(isSticky
              ? ([
                {
                  key: 'stickyOffset',
                  label: 'Sticky offset',
                  type: 'number',
                  min: 0,
                  max: 200,
                  suffix: 'px',
                },
                { key: 'shrinkOnScroll', label: 'Shrink on scroll', type: 'checkbox' },
                { key: 'stickyBackground', label: 'Sticky background', type: 'color' },
              ] as SettingsPanelField<MenuSettings>[])
              : []),
            ...(canHideOnScroll
              ? ([
                { key: 'hideOnScroll', label: 'Hide on scroll', type: 'checkbox' },
                ...(settings.hideOnScroll
                  ? ([
                    {
                      key: 'showOnScrollUpAfterPx',
                      label: 'Show on scroll up after',
                      type: 'number',
                      min: 0,
                      max: 600,
                      suffix: 'px',
                    },
                  ] as SettingsPanelField<MenuSettings>[])
                  : []),
              ] as SettingsPanelField<MenuSettings>[])
              : []),
          ];
        }

        case 'Active State':
          return [
            {
              key: 'activeStyle',
              label: 'Style',
              type: 'select',
              options: ACTIVE_STYLE_OPTIONS,
            },
            { key: 'activeColor', label: 'Active color', type: 'color' },
          ];

        case 'Hover Effects':
          return [
            {
              key: 'hoverStyle',
              label: 'Style',
              type: 'select',
              options: HOVER_STYLE_OPTIONS,
            },
            { key: 'hoverColor', label: 'Hover color', type: 'color' },
            {
              key: 'transitionSpeed',
              label: 'Transition speed',
              type: 'range',
              min: 100,
              max: 500,
              suffix: 'ms',
            },
          ];

        case 'Animations':
          return [
            {
              key: 'menuEntryAnimation',
              label: 'Entry animation',
              type: 'select',
              options: ANIMATION_PRESETS,
            },
            {
              key: 'menuHoverAnimation',
              label: 'Hover animation',
              type: 'select',
              options: ANIMATION_PRESETS,
            },
          ];

        default:
          return [];
      }
    },
    [settings, colorSchemeOptions, menuColorSchemeId]
  );

  useEffect((): void => {
    if (!settingsReady) return;
    hasHydratedRef.current = true;
    loadedKeyRef.current = menuKey;
  }, [menuKey, settingsReady]);

  useEffect((): void => {
    if (!hasHydratedRef.current) return;
    if (loadedKeyRef.current !== menuKey) return;
    if (!userSettings) return;
    const nextSerialized = serializeSetting(userSettings);
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout((): void => {
      updateSetting.mutate({ key: menuKey, value: nextSerialized });
    }, 500);
  }, [menuKey, userSettings, updateSetting]);

  useEffect((): (() => void) => {
    return (): void => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const toggleSection = useCallback((section: string): void => {
    setOpenSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const renderSectionBody = useCallback(
    (section: string): React.ReactNode => {
      if (section === 'Menu Items') {
        return (
          <div className='space-y-2'>
            {settings.items.map((item: MenuItem) => (
              <div
                key={item.id}
                className='flex items-start gap-1.5 rounded-md border border-border/60 bg-card/30 p-2'
              >
                <div className='flex-1 space-y-1.5'>
                  <Input
                    value={item.label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateMenuItem(item.id, 'label', e.target.value)
                    }
                    aria-label='Menu item label'
                    placeholder='Label'
                    className='h-7 bg-gray-800/40 text-xs'
                   title='Label'/>
                  <Input
                    value={item.url}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      updateMenuItem(item.id, 'url', e.target.value)
                    }
                    aria-label='Menu item URL'
                    placeholder='URL'
                    className='h-7 bg-gray-800/40 text-xs'
                   title='URL'/>
                  {settings.showItemImages && (
                    <Input
                      value={item.imageUrl ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        updateMenuItem(item.id, 'imageUrl', e.target.value)
                      }
                      aria-label='Menu item image URL'
                      placeholder='Image URL'
                      className='h-7 bg-gray-800/40 text-xs'
                     title='Image URL'/>
                  )}
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={(): void => removeMenuItem(item.id)}
                  className='mt-1 size-7 p-0 text-gray-500 hover:text-red-300 hover:bg-red-500/10'
                  title='Remove item'
                  aria-label='Remove menu item'
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            ))}
            <Button size='sm' variant='outline' className='w-full text-xs' onClick={addMenuItem}>
              <Plus className='mr-1.5 size-3.5' />
              Add menu item
            </Button>
          </div>
        );
      }

      const fields = getFieldsForSection(section);
      if (fields.length === 0) {
        return <div className='text-xs text-gray-500'>Settings coming soon.</div>;
      }

      return (
        <SettingsFieldsRenderer
          fields={fields}
          values={settings}
          onChange={(values: Partial<MenuSettings>) =>
            setUserSettings((prev) => ({ ...(prev ?? initialSettings), ...values }))
          }
        />
      );
    },
    [settings, initialSettings, getFieldsForSection, addMenuItem, updateMenuItem, removeMenuItem]
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {showHeader && (
        <SectionHeader
          title='Menu settings'
          subtitle='Configure the look and behaviour of your page navigation.'
          size='xs'
          className='p-3 border-b border-border'
        />
      )}
      <div className='flex-1 overflow-y-auto p-3'>
        <div className='space-y-3'>
          <FormSection title='Menu scope' variant='subtle' className='p-3'>
            {zoningEnabled ? (
              <div className='mt-2 space-y-2'>
                <SelectSimple
                  size='sm'
                  value={menuScopeId}
                  onValueChange={(value: string): void => {
                    setUserMenuScopeId(value);
                  }}
                  options={menuScopeOptions}
                  placeholder='Select zone'
                  ariaLabel='Menu scope'
                  triggerClassName='h-8 text-xs'
                 title='Select zone'/>
                {menuScopeId !== 'default' && !hasScopedMenu ? (
                  <p className='text-[10px] text-gray-500'>
                    Using base menu defaults until you customize this scope.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className='mt-2 text-[11px] text-gray-500'>
                Simple routing enabled. This menu applies globally.
              </p>
            )}
          </FormSection>
          <div className='space-y-2'>
            {MENU_SECTIONS.map((section: string) => {
              const isOpen = openSections.has(section);
              return (
                <FormSection
                  key={section}
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
    </div>
  );
}
