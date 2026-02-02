// Playwright DTOs
export interface PlaywrightTestDto {
  id: string;
  name: string;
  description: string | null;
  script: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaywrightTestRunDto {
  id: string;
  testId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result: Record<string, unknown> | null;
  error: string | null;
  duration: number | null;
  screenshots: string[];
  createdAt: string;
  updatedAt: string;
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
