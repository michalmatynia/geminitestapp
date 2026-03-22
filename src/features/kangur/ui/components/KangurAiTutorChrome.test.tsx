/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurAiTutorChromeTextButton } from './KangurAiTutorChrome';

describe('KangurAiTutorChromeTextButton', () => {
  it('uses touch-friendly chrome button sizing and interaction classes', () => {
    render(<KangurAiTutorChromeTextButton>Akcja</KangurAiTutorChromeTextButton>);

    expect(screen.getByRole('button', { name: 'Akcja' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'active:scale-[0.97]',
      'max-sm:min-h-11',
      'max-sm:px-4'
    );
  });
});
