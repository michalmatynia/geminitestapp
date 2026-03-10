import 'server-only';

import type {
  TraderaApiCredentials,
  TraderaApiUserInfo,
  TraderaAddShopItemInput,
  TraderaAddShopItemResult,
} from '@/shared/contracts/integrations';
import { configurationError, externalServiceError } from '@/shared/errors/app-error';

export type {
  TraderaApiCredentials,
  TraderaApiUserInfo,
  TraderaAddShopItemInput,
  TraderaAddShopItemResult,
};

type TraderaSoapService = 'public' | 'restricted';

const DEFAULT_API_BASE_URL = 'https://api.tradera.com/v3';
const DEFAULT_TIMEOUT_MS = 25_000;
const TRADERA_API_BASE_URL = (process.env['TRADERA_API_BASE_URL'] || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  ''
);
const DEFAULT_MAX_RESULT_AGE_SECONDS = 300;

const normalizeText = (value: string | null | undefined): string => (value ?? '').trim();

const decodeXmlEntities = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&amp;/g, '&');

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return null;
};

const extractFirstTagValue = (xml: string, tagName: string): string | null => {
  const regex = new RegExp(
    `<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`,
    'i'
  );
  const match = xml.match(regex);
  if (!match?.[1]) return null;
  return decodeXmlEntities(match[1].trim());
};

const extractFaultMessage = (xml: string): string | null => {
  const candidates = [
    extractFirstTagValue(xml, 'faultstring'),
    extractFirstTagValue(xml, 'Text'),
    extractFirstTagValue(xml, 'Message'),
    extractFirstTagValue(xml, 'ErrorMessage'),
  ];
  const message = candidates.find((value) => Boolean(normalizeText(value)));
  return message ? normalizeText(message) : null;
};

const extractHtmlTitle = (text: string): string | null => {
  const match = text.match(/<title>\s*([^<]+?)\s*<\/title>/i);
  return match?.[1] ? normalizeText(decodeXmlEntities(match[1])) : null;
};

const buildSoapEnvelope = ({
  method,
  bodyXml,
  credentials,
}: {
  method: string;
  bodyXml: string;
  credentials: TraderaApiCredentials;
}): string => {
  const maxResultAge = Math.max(
    0,
    credentials.maxResultAgeSeconds ?? DEFAULT_MAX_RESULT_AGE_SECONDS
  );
  const sandboxValue = credentials.sandbox ? 1 : 0;
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthenticationHeader xmlns="http://api.tradera.com">
      <AppId>${credentials.appId}</AppId>
      <AppKey>${escapeXml(credentials.appKey)}</AppKey>
    </AuthenticationHeader>
    <AuthorizationHeader xmlns="http://api.tradera.com">
      <UserId>${credentials.userId}</UserId>
      <Token>${escapeXml(credentials.token)}</Token>
    </AuthorizationHeader>
    <ConfigurationHeader xmlns="http://api.tradera.com">
      <Sandbox>${sandboxValue}</Sandbox>
      <MaxResultAge>${maxResultAge}</MaxResultAge>
    </ConfigurationHeader>
  </soap:Header>
  <soap:Body>
    <${method} xmlns="http://api.tradera.com">
      ${bodyXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`;
};

const resolveServiceUrl = (service: TraderaSoapService): string =>
  service === 'restricted'
    ? `${TRADERA_API_BASE_URL}/restrictedservice.asmx`
    : `${TRADERA_API_BASE_URL}/publicservice.asmx`;

const validateCredentials = (credentials: TraderaApiCredentials): void => {
  if (!toPositiveInt(credentials.appId)) {
    throw configurationError('Tradera API App ID is missing or invalid.');
  }
  if (!normalizeText(credentials.appKey)) {
    throw configurationError('Tradera API App Key is required.');
  }
  if (!toPositiveInt(credentials.userId)) {
    throw configurationError('Tradera API User ID is missing or invalid.');
  }
  if (!normalizeText(credentials.token)) {
    throw configurationError('Tradera API token is required.');
  }
};

const callTraderaSoap = async ({
  service,
  method,
  bodyXml,
  credentials,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  service: TraderaSoapService;
  method: string;
  bodyXml: string;
  credentials: TraderaApiCredentials;
  timeoutMs?: number;
}): Promise<string> => {
  validateCredentials(credentials);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(resolveServiceUrl(service), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `http://api.tradera.com/${method}`,
        Accept: 'text/xml',
      },
      body: buildSoapEnvelope({ method, bodyXml, credentials }),
      signal: controller.signal,
    });

    const text = await response.text();
    const faultMessage = extractFaultMessage(text);
    if (!response.ok) {
      if (response.status === 403) {
        const htmlTitle = extractHtmlTitle(text);
        const detail = htmlTitle || `${response.status} ${response.statusText}`;
        const permissionHint =
          service === 'restricted'
            ? 'RestrictedService access is denied for this Tradera application key (method disabled or not approved).'
            : 'PublicService access is denied for this Tradera application key.';
        throw externalServiceError(`Tradera API ${method} failed: ${detail}. ${permissionHint}`, {
          status: response.status,
        });
      }
      const detail =
        faultMessage ||
        normalizeText(text).slice(0, 600) ||
        `${response.status} ${response.statusText}`;
      throw externalServiceError(`Tradera API ${method} failed: ${detail}`, {
        status: response.status,
      });
    }
    if (faultMessage) {
      throw externalServiceError(`Tradera API ${method} failed: ${faultMessage}`);
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw externalServiceError(`Tradera API ${method} timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const parseRequestResultBlock = (
  xml: string,
  requestId: number
): { code: string | null; message: string | null } => {
  const blockRegex = /<(?:\w+:)?RequestResult\b[^>]*>([\s\S]*?)<\/(?:\w+:)?RequestResult>/gi;
  const blocks = Array.from(xml.matchAll(blockRegex));
  const selectedBlock =
    blocks.find((match) => {
      const block = match[1] ?? '';
      const id = extractFirstTagValue(block, 'RequestId');
      return toPositiveInt(id) === requestId;
    })?.[1] ??
    blocks[0]?.[1] ??
    '';
  if (!selectedBlock) {
    return { code: null, message: null };
  }
  return {
    code: extractFirstTagValue(selectedBlock, 'ResultCode'),
    message: extractFirstTagValue(selectedBlock, 'Message'),
  };
};

const wait = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const pollRequestResult = async ({
  requestId,
  credentials,
  attempts = 4,
  intervalMs = 1500,
}: {
  requestId: number;
  credentials: TraderaApiCredentials;
  attempts?: number;
  intervalMs?: number;
}): Promise<{ code: string | null; message: string | null }> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await wait(intervalMs);
    }
    const response = await callTraderaSoap({
      service: 'restricted',
      method: 'GetRequestResults',
      bodyXml: `<requestIds><int>${requestId}</int></requestIds>`,
      credentials,
    });
    const parsed = parseRequestResultBlock(response, requestId);
    const code = normalizeText(parsed.code);
    if (!code || code === 'WaitingToBeProcessed' || code === 'Processing') {
      continue;
    }
    return parsed;
  }
  return { code: null, message: null };
};

export const getTraderaUserInfo = async (
  credentials: TraderaApiCredentials
): Promise<TraderaApiUserInfo> => {
  const userId = toPositiveInt(credentials.userId);
  if (!userId) {
    throw configurationError('Tradera API User ID is missing or invalid.');
  }
  const response = await callTraderaSoap({
    service: 'restricted',
    method: 'GetUserInfo',
    bodyXml: '',
    credentials,
  });
  const userInfoBlock = extractFirstTagValue(response, 'GetUserInfoResult') ?? response;
  const resolvedUserId = toPositiveInt(extractFirstTagValue(userInfoBlock, 'Id')) ?? userId;
  return {
    userId: resolvedUserId,
    alias: extractFirstTagValue(userInfoBlock, 'Alias'),
    email: extractFirstTagValue(userInfoBlock, 'Email'),
    firstName: extractFirstTagValue(userInfoBlock, 'FirstName'),
    lastName: extractFirstTagValue(userInfoBlock, 'LastName'),
  };
};

export const addTraderaShopItem = async ({
  input,
  credentials,
}: {
  input: TraderaAddShopItemInput;
  credentials: TraderaApiCredentials;
}): Promise<TraderaAddShopItemResult> => {
  const safeTitle = normalizeText(input.title).slice(0, 100);
  const safeDescription = normalizeText(input.description);
  const categoryId = toPositiveInt(input.categoryId);
  const quantity = Math.max(1, toPositiveInt(input.quantity) ?? 1);
  const acceptedBuyerId = Math.max(0, toPositiveInt(input.acceptedBuyerId ?? 0) ?? 0);
  if (!safeTitle) {
    throw configurationError('Tradera item title is required.');
  }
  if (!safeDescription) {
    throw configurationError('Tradera item description is required.');
  }
  if (!categoryId) {
    throw configurationError('Tradera category ID is missing or invalid.');
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw configurationError('Tradera price must be greater than 0.');
  }

  const response = await callTraderaSoap({
    service: 'restricted',
    method: 'AddShopItem',
    bodyXml: `
<shopItemData>
  <Title>${escapeXml(safeTitle)}</Title>
  <Description>${escapeXml(safeDescription)}</Description>
  <CategoryId>${categoryId}</CategoryId>
  <AcceptedBuyerId>${acceptedBuyerId}</AcceptedBuyerId>
  <ShippingCondition>${escapeXml(input.shippingCondition)}</ShippingCondition>
  <PaymentCondition>${escapeXml(input.paymentCondition)}</PaymentCondition>
  <Price>${input.price.toFixed(2)}</Price>
  <Quantity>${quantity}</Quantity>
</shopItemData>`,
    credentials,
  });

  const itemId = toPositiveInt(extractFirstTagValue(response, 'ItemId'));
  const requestId = toPositiveInt(extractFirstTagValue(response, 'RequestId'));
  if (!itemId) {
    throw externalServiceError('Tradera API did not return a valid item ID for AddShopItem.');
  }

  if (!requestId) {
    return {
      itemId,
      requestId: null,
      resultCode: null,
      resultMessage: null,
    };
  }

  const requestResult = await pollRequestResult({
    requestId,
    credentials,
  });
  const code = normalizeText(requestResult.code);
  if (code && !['Ok', 'WaitingToBeProcessed', 'Processing'].includes(code)) {
    const detail = normalizeText(requestResult.message) || 'Unknown Tradera API error.';
    throw externalServiceError(`Tradera request ${requestId} failed (${code}): ${detail}`);
  }

  return {
    itemId,
    requestId,
    resultCode: requestResult.code,
    resultMessage: requestResult.message,
  };
};
