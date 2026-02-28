import { render, screen } from '@testing-library/react';

import { FrontendBlockRenderer } from '@/features/cms/components/frontend/sections/FrontendBlockRenderer';

describe('FrontendBlockRenderer Component', () => {
  it('should render a Heading block with correct size and text', () => {
    const block = {
      id: 'b1',
      type: 'Heading',
      settings: { headingText: 'Hello World', headingSize: 'large' },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    const heading = screen.getByText('Hello World');
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveClass('text-3xl'); // large size class
  });

  it('should render a Text block', () => {
    const block = {
      id: 'b2',
      type: 'Text',
      settings: { textContent: 'Some description here' },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    expect(screen.getByText('Some description here')).toBeInTheDocument();
  });

  it('should render a Button block with link and label', () => {
    const block = {
      id: 'b3',
      type: 'Button',
      settings: { buttonLabel: 'Click Me', buttonLink: '/test-page' },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    const link = screen.getByRole('link', { name: 'Click Me' });
    expect(link).toHaveAttribute('href', '/test-page');
  });

  it('should render an Image block when src is provided', () => {
    const block = {
      id: 'b4',
      type: 'Image',
      settings: { src: '/test.jpg', alt: 'Test Image', width: 50 },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    const img = screen.getByAltText('Test Image');
    expect(img).toBeInTheDocument();
    // Check if parent has correct width
    expect(img.closest('div')).toHaveStyle('width: 50%');
  });

  it('should render placeholder for Image block when src is missing', () => {
    const block = {
      id: 'b5',
      type: 'Image',
      settings: { src: '' },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    expect(screen.getByText('No image selected')).toBeInTheDocument();
  });

  it('should render custom styles for Button block', () => {
    const block = {
      id: 'b6',
      type: 'Button',
      settings: {
        buttonLabel: 'Styled',
        textColor: 'rgb(255, 0, 0)',
        bgColor: 'rgb(0, 255, 0)',
        borderRadius: 15,
      },
    };

    render(<FrontendBlockRenderer block={block as any} />);
    const link = screen.getByRole('link', { name: 'Styled' });
    expect(link).toHaveStyle({
      color: 'rgb(255, 0, 0)',
      backgroundColor: 'rgb(0, 255, 0)',
      borderRadius: '15px',
    });
  });

  it('should return null for unknown block type', () => {
    const block = {
      id: 'b7',
      type: 'Unknown',
      settings: {},
    };

    const { container } = render(<FrontendBlockRenderer block={block as any} />);
    expect(container.firstChild).toBeNull();
  });
});
