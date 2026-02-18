'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import React, { useCallback } from 'react';

import type { ColorScheme, ThemeSettings } from '@/features/cms/types/theme-settings';
import { Button, Badge } from '@/shared/ui';

import { useThemeColors } from './ThemeColorsContext';
import { ColorField, TextField } from '../shared-fields';
import { useThemeSettings } from '../ThemeSettingsContext';
import { ThemeAiSection } from './ThemeAiSection';


export function ThemeColorsSection(): React.JSX.Element {
  const { theme, update } = useThemeSettings();
  const {
    schemeView,
    setSchemeView,
    editingSchemeId,
    setEditingSchemeId,
    activeScheme,
    startAddScheme,
    startEditScheme,
    handleSaveScheme,
    newSchemeName,
    setNewSchemeName,
    newSchemeColors,
    updateSchemeColor,
    isGlobalPaletteOpen,
    toggleGlobalPalette,
  } = useThemeColors();

  const updateSetting = useCallback(<K extends keyof ThemeSettings>(key: K) => (value: ThemeSettings[K]) => {
    update(key, value);
  }, [update]);

  return (
    <div className='space-y-4'>
      <div className='rounded border border-border/40 bg-gray-900/60 p-3'>
        <div className='flex items-center justify-end'>
          {schemeView === 'list' ? (
            <div className='flex items-center gap-2'>
              {activeScheme && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => startEditScheme(activeScheme.id)}
                  className='h-7 px-2 text-[11px]'
                >
                  Edit scheme
                </Button>
              )}
              <Button
                size='sm'
                variant='outline'
                onClick={startAddScheme}
                className='h-7 px-2 text-[11px]'
              >
                Add scheme
              </Button>
            </div>
          ) : (
            <Button
              size='sm'
              variant='ghost'
              onClick={() => {
                setSchemeView('list');
                setEditingSchemeId(null);
              }}
              className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
            >
              <ArrowLeft className='mr-1 size-3' />
              Back to schemes
            </Button>
          )}
        </div>
        {schemeView === 'list' ? (
          theme.colorSchemes.length > 0 ? (
            <div className='mt-3 flex flex-col gap-3'>
              {theme.colorSchemes.map((scheme: ColorScheme) => {
                const isActive = scheme.id === theme.activeColorSchemeId;
                return (
                  <div
                    key={scheme.id}
                    className={`group rounded border p-2 text-left transition ${
                      isActive
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-border/40 bg-gray-900/40 hover:border-border/70'
                    }`}
                  >
                    <div
                      role='button'
                      tabIndex={0}
                      onClick={(): void => update('activeColorSchemeId', scheme.id)}
                      onKeyDown={(event: React.KeyboardEvent): void => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          update('activeColorSchemeId', scheme.id);
                        }
                      }}
                      className='w-full text-left'
                    >
                      <div className='mb-2 flex items-start justify-between gap-2 text-[11px] text-gray-300'>
                        <span className='whitespace-normal break-words'>{scheme.name}</span>
                        <div className='flex items-center gap-2'>
                          {isActive && (
                            <Badge variant='outline' className='border-blue-500/40 bg-blue-500/20 px-2 py-0 text-[10px] text-blue-200'>
                              Active
                            </Badge>
                          )}
                          <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            onClick={(event: React.MouseEvent): void => {
                              event.stopPropagation();
                              startEditScheme(scheme.id);
                            }}
                            className='h-6 px-2 text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-transparent hover:text-gray-200'
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                      <div
                        className='rounded border p-2'
                        style={{ backgroundColor: scheme.colors.background, borderColor: scheme.colors.border }}
                      >
                        <div
                          className='overflow-hidden rounded border'
                          style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                        >
                          <div
                            className='flex items-center justify-between border-b px-2 py-1'
                            style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                          >
                            <div
                              className='h-1.5 w-10 rounded'
                              style={{ backgroundColor: scheme.colors.text, opacity: 0.75 }}
                            />
                            <div
                              className='h-1.5 w-6 rounded'
                              style={{ backgroundColor: scheme.colors.accent }}
                            />
                          </div>
                          <div className='space-y-2 p-2'>
                            <div
                              className='rounded border p-2'
                              style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                            >
                              <div
                                className='h-2 w-4/5 rounded'
                                style={{ backgroundColor: scheme.colors.text, opacity: 0.8 }}
                              />
                              <div
                                className='mt-1 h-2 w-2/3 rounded'
                                style={{ backgroundColor: scheme.colors.text, opacity: 0.6 }}
                              />
                              <div className='mt-2 flex gap-2'>
                                <div
                                  className='h-2 w-8 rounded'
                                  style={{ backgroundColor: scheme.colors.accent }}
                                />
                                <div
                                  className='h-2 w-8 rounded'
                                  style={{ backgroundColor: scheme.colors.text, opacity: 0.35 }}
                                />
                              </div>
                            </div>
                            <div
                              className='h-1 w-full rounded'
                              style={{ backgroundColor: scheme.colors.border, opacity: 0.7 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='mt-3 text-xs text-gray-500'>No schemes yet.</div>
          )
        ) : (
          <div className='mt-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='text-xs text-gray-400'>
                {editingSchemeId ? 'Edit scheme' : 'New scheme'}
              </div>
              <Button
                size='sm'
                onClick={handleSaveScheme}
                className='bg-blue-600 text-white hover:bg-blue-700'
              >
                {editingSchemeId ? 'Save scheme' : 'Create scheme'}
              </Button>
            </div>
            <TextField
              label='Scheme name'
              value={newSchemeName}
              onChange={setNewSchemeName}
              placeholder='e.g. Midnight'
            />
            <div className='grid grid-cols-2 gap-2'>
              <ColorField
                label='Background'
                value={newSchemeColors.background}
                onChange={updateSchemeColor('background')}
              />
              <ColorField
                label='Surface'
                value={newSchemeColors.surface}
                onChange={updateSchemeColor('surface')}
              />
              <ColorField
                label='Text'
                value={newSchemeColors.text}
                onChange={updateSchemeColor('text')}
              />
              <ColorField
                label='Accent'
                value={newSchemeColors.accent}
                onChange={updateSchemeColor('accent')}
              />
              <ColorField
                label='Border'
                value={newSchemeColors.border}
                onChange={updateSchemeColor('border')}
              />
            </div>
            <ThemeAiSection />
          </div>
        )}
      </div>

      <div className='rounded border border-border/40 bg-gray-900/40 p-3'>
        <button
          type='button'
          onClick={toggleGlobalPalette}
          className='flex w-full items-center justify-between gap-2 text-left'
        >
          <span className='text-[10px] uppercase tracking-wider text-gray-500'>Global palette</span>
          <ChevronDown className={`size-3 text-gray-500 transition ${isGlobalPaletteOpen ? 'rotate-180' : ''}`} />
        </button>
        {isGlobalPaletteOpen && (
          <div className='mt-3 space-y-3'>
            <ColorField label='Primary' value={theme.primaryColor} onChange={updateSetting('primaryColor')} />
            <ColorField label='Secondary' value={theme.secondaryColor} onChange={updateSetting('secondaryColor')} />
            <ColorField label='Accent' value={theme.accentColor} onChange={updateSetting('accentColor')} />
            <ColorField label='Background' value={theme.backgroundColor} onChange={updateSetting('backgroundColor')} />
            <ColorField label='Surface' value={theme.surfaceColor} onChange={updateSetting('surfaceColor')} />
            <ColorField label='Text' value={theme.textColor} onChange={updateSetting('textColor')} />
            <ColorField label='Muted text' value={theme.mutedTextColor} onChange={updateSetting('mutedTextColor')} />
            <ColorField label='Border' value={theme.borderColor} onChange={updateSetting('borderColor')} />
            <ColorField label='Error' value={theme.errorColor} onChange={updateSetting('errorColor')} />
            <ColorField label='Success' value={theme.successColor} onChange={updateSetting('successColor')} />
          </div>
        )}
      </div>
    </div>
  );
}
