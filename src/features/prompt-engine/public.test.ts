import { describe, expect, it } from 'vitest';

import * as promptEnginePublic from './public';

describe('prompt-engine public barrel', () => {
  it('continues exposing shared prompt-engine runtime APIs', () => {
    expect(promptEnginePublic).toHaveProperty('PROMPT_ENGINE_SETTINGS_KEY');
    expect(promptEnginePublic).toHaveProperty('defaultPromptEngineSettings');
    expect(promptEnginePublic).toHaveProperty('formatProgrammaticPrompt');
    expect(promptEnginePublic).toHaveProperty('validateProgrammaticPrompt');
    expect(promptEnginePublic).toHaveProperty('validateImageStudioParams');
  });

  it('continues exposing context and admin page entry points', () => {
    expect(promptEnginePublic).toHaveProperty('PromptEngineProvider');
    expect(promptEnginePublic).toHaveProperty('usePromptEngineActions');
    expect(promptEnginePublic).toHaveProperty('AdminPromptEngineValidationPatternsPage');
    expect(promptEnginePublic).toHaveProperty('AdminPromptEngineValidationClientPage');
  });
});
