import { NamedDto, CreateDto, UpdateDto } from '../types/base';

// App Embeds DTOs
export interface AppEmbedDto extends NamedDto {
  type: 'iframe' | 'widget' | 'script';
  config: Record<string, unknown>;
  embedCode: string;
  enabled: boolean;
}

export type CreateAppEmbedDto = CreateDto<AppEmbedDto>;
export type UpdateAppEmbedDto = UpdateDto<AppEmbedDto>;
