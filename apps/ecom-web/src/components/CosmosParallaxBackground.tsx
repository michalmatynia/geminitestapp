import type { JSX } from 'react';

export function CosmosParallaxBackground({ enabled }: { enabled: boolean }): JSX.Element | null {
  if (!enabled) return null;

  return (
    <div aria-hidden='true' className='cosmos-parallax-bg'>
      <div className='cosmos-parallax-layer cosmos-parallax-layer--far' />
      <div className='cosmos-parallax-layer cosmos-parallax-layer--mid' />
      <div className='cosmos-parallax-layer cosmos-parallax-layer--near' />
    </div>
  );
}
