import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTraderaCategories, parseTraderaCategoriesXml } from './tradera-api-client';

describe('parseTraderaCategoriesXml', () => {
  it('parses nested Tradera category xml into flat category records', () => {
    const xml = `
      <Categories>
        <Category Id="1" Name="Collectibles">
          <Category Id="2" Name="Pins"></Category>
          <Category Id="3" Name="Keychains"></Category>
        </Category>
        <Category Id="4" Name="Movies"></Category>
      </Categories>
    `;

    expect(parseTraderaCategoriesXml(xml)).toEqual([
      { id: '1', name: 'Collectibles', parentId: null },
      { id: '2', name: 'Pins', parentId: '1' },
      { id: '3', name: 'Keychains', parentId: '1' },
      { id: '4', name: 'Movies', parentId: null },
    ]);
  });
});

describe('getTraderaCategories', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the public GetCategories SOAP endpoint and parses categories', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCategoriesResponse xmlns="http://api.tradera.com">
      <GetCategoriesResult>
        <Categories>
          <Category Id="10" Name="Collectibles">
            <Category Id="11" Name="Pins"></Category>
          </Category>
        </Categories>
      </GetCategoriesResult>
    </GetCategoriesResponse>
  </soap:Body>
</soap:Envelope>`,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTraderaCategories({
      appId: 123,
      appKey: 'secret-key',
      sandbox: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.tradera.com/v3/publicservice.asmx',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          SOAPAction: 'http://api.tradera.com/GetCategories',
        }),
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('<GetCategories xmlns="http://api.tradera.com">');
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain('<AuthorizationHeader');
    expect(result).toEqual([
      { id: '10', name: 'Collectibles', parentId: null },
      { id: '11', name: 'Pins', parentId: '10' },
    ]);
  });
});
