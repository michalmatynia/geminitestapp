import { describe, expect, it, vi } from 'vitest';

import {
  normalizeGeowidgetEventPoint,
  normalizeGeowidgetPoint,
  readGeowidgetPointSelectedRegistrar,
} from './inpost-geowidget';

describe('normalizeGeowidgetPoint', () => {
  it('normalizes direct geowidget point payloads with full address details', () => {
    expect(normalizeGeowidgetPoint({
      name: 'WAW01A',
      description: 'Paczkomat przy sklepie',
      address_details: {
        street: 'Testowa',
        building_number: '12',
        city: 'Warszawa',
        post_code: '00-001',
      },
      location: {
        latitude: 52.2297,
        longitude: 21.0122,
      },
    })).toEqual({
      id: 'WAW01A',
      name: 'WAW01A',
      description: 'Paczkomat przy sklepie',
      addressLine1: 'Testowa 12',
      city: 'Warszawa',
      postCode: '00-001',
      latitude: 52.2297,
      longitude: 21.0122,
    });
  });

  it('normalizes nested event detail payloads from geowidget integrations', () => {
    expect(normalizeGeowidgetPoint({
      point: {
        id: 'krk 02b',
        address: {
          line1: 'ul. Długa 3',
          line2: 'przy wejściu',
        },
        address_details: {
          city: 'Kraków',
          post_code: '31-147',
        },
      },
    })).toEqual({
      id: 'KRK02B',
      name: 'KRK02B',
      addressLine1: 'ul. Długa 3',
      addressLine2: 'przy wejściu',
      city: 'Kraków',
      postCode: '31-147',
    });
  });

  it('rejects payloads without a locker id', () => {
    expect(normalizeGeowidgetPoint({ address_details: { city: 'Warszawa' } })).toBeNull();
    expect(normalizeGeowidgetPoint({ name: '<script>' })).toBeNull();
    expect(normalizeGeowidgetPoint(null)).toBeNull();
  });

  it('normalizes documented geowidget event payload shapes', () => {
    expect(normalizeGeowidgetEventPoint({ details: { name: 'WAW01A' } } as unknown as Event)).toEqual({
      id: 'WAW01A',
      name: 'WAW01A',
    });
    expect(normalizeGeowidgetEventPoint({ detail: { point: { id: 'krk02b' } } } as unknown as Event)).toEqual({
      id: 'KRK02B',
      name: 'KRK02B',
    });
  });

  it('reads the geowidget init API point selection callback registrar', () => {
    const addPointSelectedCallback = vi.fn();
    const event = {
      detail: {
        api: { addPointSelectedCallback },
      },
    } as unknown as Event;
    const callback = vi.fn();

    const register = readGeowidgetPointSelectedRegistrar(event);
    register?.(callback);

    expect(addPointSelectedCallback).toHaveBeenCalledWith(callback);
  });
});
