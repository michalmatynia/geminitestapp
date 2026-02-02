// App Embeds DTOs
export interface AppEmbedDto {
  id: string;
  name: string;
  description: string | null;
  type: 'iframe' | 'widget' | 'script';
  config: Record<string, unknown>;
  embedCode: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
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
