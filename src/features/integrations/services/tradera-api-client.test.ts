import { afterEach, describe, expect, it, vi } from 'vitest';

import { addTraderaShopItem, getTraderaCategories, parseTraderaCategoriesXml } from './tradera-api-client';

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

  it('preserves three-level Tradera category branches', () => {
    const xml = `
      <Categories>
        <Category Id="49" Name="Collectibles">
          <Category Id="2929" Name="Pins &amp; needles">
            <Category Id="292904" Name="Other pins &amp; needles"></Category>
            <Category Id="292903" Name="Sports"></Category>
          </Category>
        </Category>
      </Categories>
    `;

    expect(parseTraderaCategoriesXml(xml)).toEqual([
      { id: '49', name: 'Collectibles', parentId: null },
      { id: '2929', name: 'Pins & needles', parentId: '49' },
      { id: '292904', name: 'Other pins & needles', parentId: '2929' },
      { id: '292903', name: 'Sports', parentId: '2929' },
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

describe('addTraderaShopItem', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes request fields and returns the item id when no poll request id is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <AddShopItemResponse xmlns="http://api.tradera.com">
      <AddShopItemResult>
        <ItemId>987</ItemId>
      </AddShopItemResult>
    </AddShopItemResponse>
  </soap:Body>
</soap:Envelope>`,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await addTraderaShopItem({
      input: {
        title: `  ${'A'.repeat(120)}  `,
        description: '  Example description  ',
        categoryId: '55',
        acceptedBuyerId: '-99',
        shippingCondition: 'Ships in box & bubble wrap',
        paymentCondition: 'Card <or> invoice',
        price: 199.9,
        quantity: 0,
      },
      credentials: {
        appId: 123,
        appKey: 'secret-key',
        userId: 456,
        token: 'token-abc',
        sandbox: false,
      },
    });

    const body = fetchMock.mock.calls[0]?.[1]?.body as string;
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.tradera.com/v3/restrictedservice.asmx',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          SOAPAction: 'http://api.tradera.com/AddShopItem',
        }),
      })
    );
    expect(body).toContain(`<Title>${'A'.repeat(100)}</Title>`);
    expect(body).toContain('<Description>Example description</Description>');
    expect(body).toContain('<CategoryId>55</CategoryId>');
    expect(body).toContain('<AcceptedBuyerId>0</AcceptedBuyerId>');
    expect(body).toContain('<Price>199.90</Price>');
    expect(body).toContain('<Quantity>1</Quantity>');
    expect(body).toContain('<ShippingCondition>Ships in box &amp; bubble wrap</ShippingCondition>');
    expect(body).toContain('<PaymentCondition>Card &lt;or&gt; invoice</PaymentCondition>');
    expect(result).toEqual({
      itemId: 987,
      requestId: null,
      resultCode: null,
      resultMessage: null,
    });
  });

  it('throws when the polled request result returns a terminal failure code', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <AddShopItemResponse xmlns="http://api.tradera.com">
      <AddShopItemResult>
        <ItemId>321</ItemId>
        <RequestId>99</RequestId>
      </AddShopItemResult>
    </AddShopItemResponse>
  </soap:Body>
</soap:Envelope>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetRequestResultsResponse xmlns="http://api.tradera.com">
      <GetRequestResultsResult>
        <RequestResult>
          <RequestId>99</RequestId>
          <ResultCode>Denied</ResultCode>
        </RequestResult>
      </GetRequestResultsResult>
    </GetRequestResultsResponse>
  </soap:Body>
</soap:Envelope>`,
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      addTraderaShopItem({
        input: {
          title: 'Example item',
          description: 'Example description',
          categoryId: 55,
          acceptedBuyerId: 0,
          shippingCondition: 'Shipping',
          paymentCondition: 'Payment',
          price: 99,
          quantity: 1,
        },
        credentials: {
          appId: 123,
          appKey: 'secret-key',
          userId: 456,
          token: 'token-abc',
          sandbox: false,
        },
      })
    ).rejects.toThrow('Tradera request 99 failed (Denied): Unknown Tradera API error.');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.tradera.com/v3/restrictedservice.asmx',
      expect.objectContaining({
        headers: expect.objectContaining({
          SOAPAction: 'http://api.tradera.com/GetRequestResults',
        }),
      })
    );
  });
});
