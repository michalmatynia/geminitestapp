import { z } from 'zod';

export const oauthTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type OAuthTokenResponseDto = z.infer<typeof oauthTokenResponseSchema>;
export type OAuthTokenResponse = OAuthTokenResponseDto;

export const linkedInProfileResponseSchema = z.object({
  sub: z.string().optional(),
  name: z.string().optional(),
});

export type LinkedInProfileResponseDto = z.infer<typeof linkedInProfileResponseSchema>;
export type LinkedInProfileResponse = LinkedInProfileResponseDto;
