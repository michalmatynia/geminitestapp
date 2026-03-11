/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminAiEyebrow, formatAdminAiEyebrow } from '@/shared/ui/admin-ai-eyebrow';

describe('AdminAiEyebrow', () => {
  it('renders the shared AI eyebrow label', () => {
    render(<AdminAiEyebrow section='Prompt Exploder' />);

    expect(screen.getByText('AI · Prompt Exploder')).toBeInTheDocument();
  });

  it('formats string-only AI eyebrow consumers', () => {
    expect(formatAdminAiEyebrow('AI Paths')).toBe('AI · AI Paths');
  });
});
