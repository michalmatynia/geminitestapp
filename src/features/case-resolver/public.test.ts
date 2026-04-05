import { describe, expect, it } from 'vitest';

import * as caseResolverPublic from './public';

describe('case-resolver public barrel', () => {
  it('continues exposing the main admin and capture pages', () => {
    expect(caseResolverPublic).toHaveProperty('AdminCaseResolverPage');
    expect(caseResolverPublic).toHaveProperty('AdminCaseResolverCasesPage');
    expect(caseResolverPublic).toHaveProperty('AdminCaseResolverSettingsPage');
    expect(caseResolverPublic).toHaveProperty('AdminCaseResolverCapturePage');
  });

  it('continues exposing core settings, helper, and party-matching utilities', () => {
    expect(caseResolverPublic).toHaveProperty('parseCaseResolverSettings');
    expect(caseResolverPublic).toHaveProperty('safeParseCaseResolverWorkspace');
    expect(caseResolverPublic).toHaveProperty('createId');
    expect(caseResolverPublic).toHaveProperty('findExistingFilemakerPartyReference');
    expect(caseResolverPublic).toHaveProperty('parseCaseResolverCaptureSettings');
  });
});
