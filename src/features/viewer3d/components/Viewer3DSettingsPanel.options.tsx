'use client';

import { Moon, Sparkles, Sun } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  orderedDitheringPresets,
  type OrderedDitheringPresetKey,
} from '../context/Viewer3DContext';
import type { EnvironmentPreset, LightingPreset } from './Viewer3D';

type LightingPresetOption = LabeledOptionDto<LightingPreset> & { icon: React.ReactNode };
type LuminanceOption = LabeledOptionDto<number>;

export const environmentPresets: Array<LabeledOptionDto<EnvironmentPreset>> = [
  { value: 'studio', label: 'Studio' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'night', label: 'Night' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'forest', label: 'Forest' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'city', label: 'City' },
  { value: 'park', label: 'Park' },
  { value: 'lobby', label: 'Lobby' },
];

export const lightingPresets: LightingPresetOption[] = [
  { value: 'studio', label: 'Studio', icon: <Sun className='h-4 w-4' /> },
  { value: 'outdoor', label: 'Outdoor', icon: <Sun className='h-4 w-4' /> },
  { value: 'dramatic', label: 'Dramatic', icon: <Moon className='h-4 w-4' /> },
  { value: 'soft', label: 'Soft', icon: <Sparkles className='h-4 w-4' /> },
];

const orderedDitheringLuminanceOptions: LuminanceOption[] = [
  { value: 0, label: 'Average' },
  { value: 1, label: 'Rec. 601' },
  { value: 2, label: 'Rec. 709' },
  { value: 3, label: 'Max Channel' },
];

export const orderedDitheringLuminanceSelectOptions: Array<LabeledOptionDto<string>> =
  orderedDitheringLuminanceOptions.map((option) => ({
    value: String(option.value),
    label: option.label,
  }));

export const orderedDitheringPresetOptions: Array<LabeledOptionDto<string>> = [
  ...Object.entries(orderedDitheringPresets).map(([key, preset]) => ({
    value: key,
    label: preset.label,
  })),
  { value: 'custom' satisfies OrderedDitheringPresetKey, label: 'Custom' },
];
