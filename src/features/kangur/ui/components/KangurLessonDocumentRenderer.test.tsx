/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';

describe('KangurLessonDocumentRenderer', () => {
  it('renders text, image, svg, activity, and grid content across modular pages', () => {
    const { container } = render(
      <KangurLessonDocumentRenderer
        renderMode='editor'
        document={{
          version: 1,
          pages: [
            {
              id: 'page-1',
              sectionKey: 'intro',
              sectionTitle: 'Introduction',
              sectionDescription: 'Get oriented before the lesson starts',
              title: 'Intro',
              description: 'Meet the lesson content',
              blocks: [
                {
                  id: 'text-1',
                  type: 'text',
                  html: '<h2>Lesson heading</h2><p>Intro paragraph</p>',
                  align: 'left',
                },
                {
                  id: 'image-1',
                  type: 'image',
                  title: 'Photo reference',
                  src: '/uploads/kangur/example.png',
                  caption: 'Image caption',
                  align: 'center',
                  fit: 'contain',
                  maxWidth: 360,
                },
              ],
            },
            {
              id: 'page-2',
              sectionKey: 'practice',
              sectionTitle: 'Practice',
              sectionDescription: 'Try the visuals and interactive tasks',
              title: 'Shapes',
              blocks: [
                {
                  id: 'svg-1',
                  type: 'svg',
                  title: 'Triangle',
                  markup:
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90 L50 10 L90 90 Z" fill="#60a5fa" /></svg>',
                  viewBox: '0 0 100 100',
                  align: 'center',
                  fit: 'contain',
                  maxWidth: 320,
                },
                {
                  id: 'activity-1',
                  type: 'activity',
                  activityId: 'clock-training',
                  title: 'Clock practice',
                  description: 'Practice reading hours and minutes.',
                },
                {
                  id: 'grid-1',
                  type: 'grid',
                  columns: 2,
                  gap: 16,
                  rowHeight: 180,
                  denseFill: true,
                  stackOnMobile: true,
                  items: [
                    {
                      id: 'item-1',
                      colSpan: 1,
                      rowSpan: 2,
                      columnStart: 2,
                      rowStart: 1,
                      block: {
                        id: 'text-2',
                        type: 'text',
                        html: '<p>Grid copy</p>',
                        align: 'left',
                      },
                    },
                    {
                      id: 'item-2',
                      colSpan: 1,
                      rowSpan: 1,
                      columnStart: null,
                      rowStart: null,
                      block: {
                        id: 'svg-2',
                        type: 'svg',
                        title: 'Circle',
                        markup:
                          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#34d399" /></svg>',
                        viewBox: '0 0 100 100',
                        align: 'center',
                        fit: 'contain',
                        maxWidth: 260,
                      },
                    },
                  ],
                },
              ],
            },
          ],
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<h2>Lesson heading</h2><p>Intro paragraph</p>',
              align: 'left',
            },
            {
              id: 'image-1',
              type: 'image',
              title: 'Photo reference',
              src: '/uploads/kangur/example.png',
              caption: 'Image caption',
              align: 'center',
              fit: 'contain',
              maxWidth: 360,
            },
            {
              id: 'svg-1',
              type: 'svg',
              title: 'Triangle',
              markup:
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 90 L50 10 L90 90 Z" fill="#60a5fa" /></svg>',
              viewBox: '0 0 100 100',
              align: 'center',
              fit: 'contain',
              maxWidth: 320,
            },
            {
              id: 'activity-1',
              type: 'activity',
              activityId: 'clock-training',
              title: 'Clock practice',
              description: 'Practice reading hours and minutes.',
            },
            {
              id: 'grid-1',
              type: 'grid',
              columns: 2,
              gap: 16,
              rowHeight: 180,
              denseFill: true,
              stackOnMobile: true,
              items: [
                {
                  id: 'item-1',
                  colSpan: 1,
                  rowSpan: 2,
                  columnStart: 2,
                  rowStart: 1,
                  block: {
                    id: 'text-2',
                    type: 'text',
                    html: '<p>Grid copy</p>',
                    align: 'left',
                  },
                },
                {
                  id: 'item-2',
                  colSpan: 1,
                  rowSpan: 1,
                  columnStart: null,
                  rowStart: null,
                  block: {
                    id: 'svg-2',
                    type: 'svg',
                    title: 'Circle',
                    markup:
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#34d399" /></svg>',
                    viewBox: '0 0 100 100',
                    align: 'center',
                    fit: 'contain',
                    maxWidth: 260,
                  },
                },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getAllByText('Section')).toHaveLength(2);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Get oriented before the lesson starts')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Lesson heading')).toBeInTheDocument();
    expect(screen.getByText('Image caption')).toBeInTheDocument();
    expect(screen.getByText('Triangle')).toBeInTheDocument();
    expect(screen.getByText('Clock practice')).toBeInTheDocument();
    expect(
      screen.getByText(/live game widget is hidden in editor preview/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Grid copy')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[style*="grid-auto-rows: 180px"]')).not.toBeNull();
    expect(container.querySelector('.md\\:grid-flow-row-dense')).not.toBeNull();
    expect(container.querySelector('[style*="--lesson-grid-column-start: 2"]')).not.toBeNull();
    expect(container.querySelector('[style*="--lesson-grid-row-start: 1"]')).not.toBeNull();
  });
});
