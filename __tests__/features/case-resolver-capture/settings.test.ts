import { describe, it, expect } from 'vitest';

import {
  parseCaseResolverCaptureSettings,
  DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
} from '@/features/case-resolver/capture/settings';

describe('case-resolver-capture settings', () => {
  describe('parseCaseResolverCaptureSettings', () => {
    it('should return defaults for null input', () => {
      const result = parseCaseResolverCaptureSettings(null);
      expect(result).toEqual(DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS);
    });

    it('should return defaults for undefined input', () => {
      const result = parseCaseResolverCaptureSettings(undefined);
      expect(result).toEqual(DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS);
    });

    it('should return defaults for invalid JSON', () => {
      const result = parseCaseResolverCaptureSettings('invalid json');
      expect(result).toEqual(DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS);
    });

    it('should parse enabled flag', () => {
      const input = JSON.stringify({ enabled: false });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.enabled).toBe(false);
    });

    it('should parse autoOpenProposalModal flag', () => {
      const input = JSON.stringify({ autoOpenProposalModal: false });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.autoOpenProposalModal).toBe(false);
    });

    it('should parse role mappings', () => {
      const input = JSON.stringify({
        roleMappings: {
          addresser: {
            enabled: false,
            defaultAction: 'createInFilemaker',
          },
        },
      });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.roleMappings.addresser.enabled).toBe(false);
      expect(result.roleMappings.addresser.defaultAction).toBe('createInFilemaker');
    });

    it('should normalize invalid action to fallback', () => {
      const input = JSON.stringify({
        roleMappings: {
          addresser: {
            defaultAction: 'invalidAction',
          },
        },
      });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.roleMappings.addresser.defaultAction).toBe('useMatched');
    });

    it('should normalize invalid targetRole to fallback', () => {
      const input = JSON.stringify({
        roleMappings: {
          addresser: {
            targetRole: 'invalidRole',
          },
        },
      });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.roleMappings.addresser.targetRole).toBe('addresser');
    });

    it('should preserve boolean flags in role mappings', () => {
      const input = JSON.stringify({
        roleMappings: {
          subject: {
            autoMatchPartyReference: true,
            autoMatchAddress: true,
          },
        },
      });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.roleMappings.subject.autoMatchPartyReference).toBe(true);
      expect(result.roleMappings.subject.autoMatchAddress).toBe(true);
    });

    it('should handle partial role mappings', () => {
      const input = JSON.stringify({
        roleMappings: {
          addresser: { enabled: false },
        },
      });
      const result = parseCaseResolverCaptureSettings(input);
      expect(result.roleMappings.addresser.enabled).toBe(false);
      expect(result.roleMappings.addressee).toEqual(
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee
      );
    });
  });
});
