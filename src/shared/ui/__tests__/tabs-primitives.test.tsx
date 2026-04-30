/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

describe('Tabs primitives', () => {
  it('renders controlled tabs without Radix callback refs', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs value='general' onValueChange={onValueChange}>
        <TabsList aria-label='Product form tabs'>
          <TabsTrigger value='general'>General</TabsTrigger>
          <TabsTrigger value='studio'>Studio</TabsTrigger>
        </TabsList>
        <TabsContent value='general'>General content</TabsContent>
        <TabsContent value='studio'>Studio content</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('General content')).toBeInTheDocument();
    expect(screen.queryByText('Studio content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));

    expect(onValueChange).toHaveBeenCalledWith('studio');
  });

  it('supports uncontrolled default tabs and force-mounted inactive panels', () => {
    render(
      <Tabs defaultValue='images'>
        <TabsList aria-label='Product form tabs'>
          <TabsTrigger value='images'>Images</TabsTrigger>
          <TabsTrigger value='studio'>Studio</TabsTrigger>
        </TabsList>
        <TabsContent value='images'>Images content</TabsContent>
        <TabsContent value='studio' forceMount>
          Studio content
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByRole('tabpanel', { name: 'Images' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Studio content')).not.toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));

    expect(screen.getByRole('tabpanel', { name: 'Studio' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Studio content')).toBeVisible();
  });
});
