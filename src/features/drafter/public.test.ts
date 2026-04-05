import { describe, expect, it } from 'vitest';

import * as drafterPublic from './public';

describe('drafter public barrel', () => {
  it('continues exposing draft creation components and form hooks', () => {
    expect(drafterPublic).toHaveProperty('DraftCreator');
    expect(drafterPublic).toHaveProperty('DraftCreatorFormProvider');
    expect(drafterPublic).toHaveProperty('useDraftCreatorBasicInfo');
    expect(drafterPublic).toHaveProperty('useDraftCreatorParameters');
  });

  it('continues exposing draft queries and admin pages', () => {
    expect(drafterPublic).toHaveProperty('useDraftQueries');
    expect(drafterPublic).toHaveProperty('useDraft');
    expect(drafterPublic).toHaveProperty('AdminDraftsPage');
  });
});
