// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RadixOverlayContentShell } from '@/shared/ui/radix-overlay-content-shell';

describe('RadixOverlayContentShell', () => {
  it('merges base classes and forwards props to overlay and content', () => {
    const Portal = ({ children }: { children?: React.ReactNode }) => <div data-testid='portal'>{children}</div>;
    const Overlay = ({
      className,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid='overlay' className={className} style={style} {...props} />;
    const Content = ({
      className,
      style,
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid='content' className={className} style={style} {...props}>{children}</div>;
    const overlayRef = React.createRef<HTMLDivElement>();
    const contentRef = React.createRef<HTMLDivElement>();

    render(
      <RadixOverlayContentShell
        Portal={Portal}
        Overlay={Overlay}
        Content={Content}
        overlayBaseClassName='overlay-base'
        contentBaseClassName='content-base'
        overlayRef={overlayRef}
        contentRef={contentRef}
        overlayProps={{
          className: 'overlay-extra',
          style: { opacity: 0.5 },
          'aria-hidden': 'true',
        }}
        contentProps={{
          className: 'content-extra',
          style: { padding: 12 },
          role: 'dialog',
        }}
      >
        <span>Dialog body</span>
      </RadixOverlayContentShell>
    );

    expect(screen.getByTestId('portal')).toBeInTheDocument();
    expect(screen.getByTestId('overlay')).toHaveClass('overlay-base', 'overlay-extra');
    expect(screen.getByTestId('overlay')).toHaveStyle({ opacity: '0.5' });
    expect(screen.getByTestId('overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('content')).toHaveClass('content-base', 'content-extra');
    expect(screen.getByTestId('content')).toHaveStyle({ padding: '12px' });
    expect(screen.getByTestId('content')).toHaveAttribute('role', 'dialog');
    expect(overlayRef.current).toBe(screen.getByTestId('overlay'));
    expect(contentRef.current).toBe(screen.getByTestId('content'));
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('preserves children passed through contentProps when no explicit shell children are provided', () => {
    const Portal = ({ children }: { children?: React.ReactNode }) => <div data-testid='portal'>{children}</div>;
    const Overlay = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid='overlay' {...props}>{children}</div>;
    const Content = ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid='content' {...props}>{children}</div>;

    render(
      <RadixOverlayContentShell
        Portal={Portal}
        Overlay={Overlay}
        Content={Content}
        overlayBaseClassName='overlay-base'
        contentBaseClassName='content-base'
        contentProps={{
          role: 'dialog',
          children: <span>Content prop body</span>,
        } as React.HTMLAttributes<HTMLDivElement>}
      />
    );

    expect(screen.getByTestId('content')).toHaveAttribute('role', 'dialog');
    expect(screen.getByText('Content prop body')).toBeInTheDocument();
  });
});
