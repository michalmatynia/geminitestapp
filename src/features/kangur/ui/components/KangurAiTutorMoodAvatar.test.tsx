import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes, SVGProps } from 'react';

import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const Icon = (props: SVGProps<SVGSVGElement>) => <svg aria-hidden='true' {...props} />;
  return {
    ...actual,
    BrainCircuit: Icon,
  };
});

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => (
    <img
      alt={alt}
      className={className}
      data-next-image='true'
      src={typeof src === 'string' ? src : ''}
      {...props}
    />
  ),
}));

describe('KangurAiTutorMoodAvatar', () => {
  it('renders the uploaded avatar image when one is available', () => {
    render(
      <KangurAiTutorMoodAvatar
        avatarImageUrl='/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
        label='Pomocnik avatar (neutral)'
      />
    );

    expect(screen.getByAltText('Pomocnik avatar (neutral)')).toHaveAttribute(
      'src',
      '/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
    );
    expect(screen.getByAltText('Pomocnik avatar (neutral)')).toHaveAttribute('data-next-image', 'true');
  });

  it('renders embedded thumbnail data URLs through next/image', () => {
    render(
      <KangurAiTutorMoodAvatar
        avatarImageUrl=' data:image/png;base64,AAA '
        label='Pomocnik avatar (neutral)'
      />
    );

    expect(screen.getByAltText('Pomocnik avatar (neutral)')).toHaveAttribute(
      'src',
      'data:image/png;base64,AAA'
    );
    expect(screen.getByAltText('Pomocnik avatar (neutral)')).toHaveAttribute('data-next-image', 'true');
  });

  it('renders sanitized persona svg markup when no image is available', () => {
    render(
      <KangurAiTutorMoodAvatar
        svgContent='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>'
        label='Pomocnik avatar (neutral)'
        data-testid='kangur-ai-tutor-mood-avatar'
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-mood-avatar').querySelector('svg')).not.toBeNull();
  });
});
