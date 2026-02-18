import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
  parseCaseResolverCaptureSettings,
} from '@/features/case-resolver-capture/settings';

describe('case-resolver-capture settings', () => {
  it('falls back to defaults for invalid payloads', () => {
    expect(parseCaseResolverCaptureSettings(null)).toEqual(
      DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS
    );

    expect(parseCaseResolverCaptureSettings(JSON.stringify([]))).toEqual(
      DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS
    );
  });

  it('parses valid settings with role mappings', () => {
    const parsed = parseCaseResolverCaptureSettings(
      JSON.stringify({
        enabled: false,
        autoOpenProposalModal: false,
        roleMappings: {
          addresser: {
            enabled: true,
            targetRole: 'addressee',
            defaultAction: 'text',
            autoMatchPartyReference: true,
            autoMatchAddress: false,
          },
          addressee: {
            enabled: false,
            targetRole: 'addresser',
            defaultAction: 'ignore',
            autoMatchPartyReference: false,
            autoMatchAddress: true,
          },
        },
      })
    );

    expect(parsed.enabled).toBe(false);
    expect(parsed.autoOpenProposalModal).toBe(false);
    expect(parsed.roleMappings.addresser).toEqual({
      enabled: true,
      targetRole: 'addressee',
      defaultAction: 'keepText',
      autoMatchPartyReference: true,
      autoMatchAddress: false,
    });
    expect(parsed.roleMappings.addressee).toEqual({
      enabled: false,
      targetRole: 'addresser',
      defaultAction: 'ignore',
      autoMatchPartyReference: false,
      autoMatchAddress: true,
    });
  });

  it('normalizes legacy action values', () => {
    const parsed = parseCaseResolverCaptureSettings(
      JSON.stringify({
        roleMappings: {
          addresser: {
            defaultAction: 'database',
          },
          addressee: {
            defaultAction: 'text',
          },
        },
      })
    );

    expect(parsed.roleMappings.addresser.defaultAction).toBe('useMatched');
    expect(parsed.roleMappings.addressee.defaultAction).toBe('keepText');
  });

  it('normalizes unsupported values back to safe defaults', () => {
    const parsed = parseCaseResolverCaptureSettings(
      JSON.stringify({
        roleMappings: {
          addresser: {
            targetRole: 'invalid',
            defaultAction: 'invalid',
            autoMatchPartyReference: 'yes',
            autoMatchAddress: 1,
          },
        },
      })
    );

    expect(parsed.roleMappings.addresser).toEqual(
      DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addresser
    );
    expect(parsed.roleMappings.addressee).toEqual(
      DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee
    );
  });
});
