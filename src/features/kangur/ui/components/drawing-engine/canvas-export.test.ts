/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

import {
  downloadKangurCanvasExport,
  downloadKangurDataUrl,
  exportKangurCanvasDataUrl,
} from './canvas-export';

describe('canvas export helper', () => {
  it('exports a canvas data url and supports quality options', () => {
    const canvas = {
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,AAA'),
    } as unknown as HTMLCanvasElement;

    expect(
      exportKangurCanvasDataUrl(canvas, {
        mimeType: 'image/jpeg',
        quality: 0.8,
      })
    ).toBe('data:image/jpeg;base64,AAA');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(exportKangurCanvasDataUrl(null)).toBeNull();
  });

  it('downloads data urls through a temporary anchor element', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    const anchor = {
      click,
      download: '',
      href: '',
      rel: '',
      remove,
      style: { display: '' },
    } as unknown as HTMLAnchorElement;
    const documentRef = {
      body: { append },
      createElement: vi.fn(() => anchor),
    } as unknown as Document;

    expect(
      downloadKangurDataUrl('data:image/png;base64,AAA', 'drawing.png', documentRef)
    ).toBe(true);
    expect(documentRef.createElement).toHaveBeenCalledWith('a');
    expect(anchor.href).toBe('data:image/png;base64,AAA');
    expect(anchor.download).toBe('drawing.png');
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(downloadKangurDataUrl('', 'drawing.png', documentRef)).toBe(false);
  });

  it('runs the shared drawing download action only when export is available', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    const exportDataUrl = vi.fn(() => 'data:image/png;base64,BBB');
    const anchor = {
      click,
      download: '',
      href: '',
      rel: '',
      remove,
      style: { display: '' },
    } as unknown as HTMLAnchorElement;
    const documentRef = {
      body: { append },
      createElement: vi.fn(() => anchor),
    } as unknown as Document;

    expect(
      downloadKangurCanvasExport({
        canExport: true,
        documentRef,
        exportDataUrl,
        filename: 'board.png',
      })
    ).toBe(true);

    expect(exportDataUrl).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('board.png');
    expect(click).toHaveBeenCalledTimes(1);

    exportDataUrl.mockClear();

    expect(
      downloadKangurCanvasExport({
        canExport: false,
        documentRef,
        exportDataUrl,
        filename: 'board.png',
      })
    ).toBe(false);

    expect(exportDataUrl).not.toHaveBeenCalled();
  });
});
