import { DtoBase, NamedDto } from '../types/base';

// Playwright DTOs
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

export interface CreatePlaywrightTestDto {
  name: string;
  description?: string;
  script: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdatePlaywrightTestDto {
  name?: string;
  description?: string;
  script?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ExecutePlaywrightTestDto {
  testId: string;
  config?: Record<string, unknown>;
}
