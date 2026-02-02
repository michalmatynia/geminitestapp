// Central DTO imports for easy access across the application
// This file provides a single import point for all DTOs

// Auth DTOs
export type {
  AuthUserDto,
  AuthUserAccessDto,
  AuthUserPageSettingsDto,
  AuthSecurityPolicyDto,
  AuthPermissionDto,
  AuthRoleDto,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  RegisterDto
} from './auth';

// Products DTOs
export type {
  ProductDto,
  ProductCategoryDto,
  ProductTagDto,
  CatalogDto,
  PriceGroupDto,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto
} from './products';

// Chatbot DTOs
export type {
  ChatbotSessionDto,
  ChatbotMessageDto,
  ChatbotMemoryItemDto,
  ChatbotContextSegmentDto,
  ChatbotSettingsDto,
  CreateChatSessionDto,
  SendMessageDto,
  UpdateChatbotSettingsDto
} from './chatbot';

// CMS DTOs
export type {
  CmsPageDto,
  CmsSlugDto,
  CmsThemeDto,
  CmsDomainDto,
  CreatePageDto,
  UpdatePageDto,
  CreateThemeDto,
  UpdateThemeDto
} from './cms';

// Files DTOs
export type {
  FileDto,
  ImageFileDto,
  UploadFileDto,
  UpdateFileDto,
  FileUploadResponseDto
} from './files';

// All other DTOs
export * from './integrations';
export * from './notesapp';
export * from './database';
export * from './jobs';
export * from './ai-paths';
export * from './agentcreator';
export * from './viewer3d';
export * from './admin';
export * from './drafter';
export * from './gsap';
export * from './playwright';
export * from './observability';
export * from './internationalization';
export * from './data-import-export';
export * from './foldertree';
export * from './app-embeds';
export * from './agent-runtime';
