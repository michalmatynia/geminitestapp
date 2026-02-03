import { NamedDto } from '../types/base';

// App Embeds DTOs
export interface AppEmbedDto extends NamedDto {
  type: 'iframe' | 'widget' | 'script';
  config: Record<string, unknown>;
  embedCode: string;
  enabled: boolean;
}

export interface CreateAppEmbedDto {
  name: string;
  description?: string;
  type: 'iframe' | 'widget' | 'script';
  config: Record<string, unknown>;
  embedCode: string;
  enabled?: boolean;
}

export interface UpdateAppEmbedDto {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  embedCode?: string;
  enabled?: boolean;
}
