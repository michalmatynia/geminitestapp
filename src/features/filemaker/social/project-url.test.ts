import { describe, expect, it } from 'vitest';

import {
  getSocialPublishingProjectUrlError,
  normalizeSocialPublishingProjectUrl,
  sanitizeSocialPublishingPromptText,
} from './project-url';

describe('getSocialPublishingProjectUrlError', () => {
  it('accepts valid public http and https URLs', () => {
    expect(getSocialPublishingProjectUrlError('https://studiq.example.com/project')).toBeNull();
    expect(getSocialPublishingProjectUrlError('http://studiq.example.com/project')).toBeNull();
  });

  it('rejects missing, malformed, localhost, and private-network URLs', () => {
    expect(getSocialPublishingProjectUrlError('')).toBe(
      'Set Settings Project URL before generating social posts.'
    );
    expect(getSocialPublishingProjectUrlError('not-a-url')).toBe(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );
    expect(getSocialPublishingProjectUrlError('http://localhost:3000')).toBe(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );
    expect(getSocialPublishingProjectUrlError('https://127.0.0.1:3000')).toBe(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );
    expect(getSocialPublishingProjectUrlError('https://10.0.2.2:3000')).toBe(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );
  });
});

describe('normalizeSocialPublishingProjectUrl', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSocialPublishingProjectUrl(' https://studiq.example.com/project ')).toBe(
      'https://studiq.example.com/project'
    );
  });
});

describe('sanitizeSocialPublishingPromptText', () => {
  it('replaces development URLs with and without schemes', () => {
    const sanitized = sanitizeSocialPublishingPromptText(
      [
        'Use http://localhost:3000 for web.',
        'Android uses http://10.0.2.2:3000.',
        'Fallback host: localhost:3000.',
        'Another fallback is 127.0.0.1:4010/test.',
      ].join(' ')
    );

    expect(sanitized).not.toContain('http://localhost:3000');
    expect(sanitized).not.toContain('http://10.0.2.2:3000');
    expect(sanitized).not.toContain('localhost:3000');
    expect(sanitized).not.toContain('127.0.0.1:4010/test');
    expect(sanitized.match(/\[local development URL removed\]/g)).toHaveLength(4);
  });
});
