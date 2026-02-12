import { DtoBase, NamedDto, CreateDto, UpdateDto } from '../types/base';

// Playwright DTOs
export interface PlaywrightSettingsDto {
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
  humanizeMouse: boolean;
  mouseJitter: number;
  clickDelayMin: number;
  clickDelayMax: number;
  inputDelayMin: number;
  inputDelayMax: number;
  actionDelayMin: number;
  actionDelayMax: number;
  proxyEnabled: boolean;
  proxyServer?: string;
  proxyUsername?: string;
  proxyPassword?: string;
  emulateDevice: boolean;
  deviceName?: string;
}

export interface PlaywrightPersonaDto extends NamedDto {
  settings: PlaywrightSettingsDto;
}

export interface PlaywrightTestDto extends NamedDto {
  script: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface PlaywrightTestRunDto extends DtoBase {
  testId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result: Record<string, unknown> | null;
  error: string | null;
  duration: number | null;
  screenshots: string[];
  completedAt: string | null;
}

export type CreatePlaywrightPersonaDto = CreateDto<PlaywrightPersonaDto>;
export type UpdatePlaywrightPersonaDto = UpdateDto<PlaywrightPersonaDto>;

export type CreatePlaywrightTestDto = CreateDto<PlaywrightTestDto>;
export type UpdatePlaywrightTestDto = UpdateDto<PlaywrightTestDto>;

export type CreatePlaywrightTestRunDto = CreateDto<PlaywrightTestRunDto>;
export type UpdatePlaywrightTestRunDto = UpdateDto<PlaywrightTestRunDto>;

export interface ExecutePlaywrightTestDto {
  testId: string;
  config?: Record<string, unknown>;
}
