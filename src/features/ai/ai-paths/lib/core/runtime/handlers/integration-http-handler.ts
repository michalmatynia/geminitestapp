import type { HttpConfig } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import {
  getValueAtMappingPath,
  renderTemplate,
} from '../../utils';
import {
  fetchWithOutboundUrlPolicy,
  OutboundUrlPolicyError,
} from '../security/outbound-url-policy';

export const handleHttp: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  abortSignal,
  sideEffectControl,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.http.has(node.id)) return prevOutputs;

  const httpConfig: HttpConfig = node.config?.http ?? {
    url: '',
    method: 'GET',
    headers: '{}',
    bodyTemplate: '',
    responseMode: 'json',
    responsePath: '',
  };
  const resolvedUrl: string = renderTemplate(
    httpConfig.url ?? '',
    nodeInputs,
    '',
  );
  if (!resolvedUrl) {
    return {
      value: null,
      bundle: { ok: false, status: 0, error: 'Missing URL' },
    };
  }
  let headers: Record<string, string> = {};
  try {
    headers = httpConfig.headers
      ? (JSON.parse(httpConfig.headers) as Record<string, string>)
      : {};
  } catch (error: unknown) {
    reportAiPathsError(
      error,
      { action: 'parseHeaders', nodeId: node.id },
      'Invalid HTTP headers JSON:',
    );
  }
  let body: BodyInit | undefined = undefined;
  if (httpConfig.method !== 'GET' && httpConfig.method !== 'DELETE') {
    const renderedBody: string = httpConfig.bodyTemplate
      ? renderTemplate(
        httpConfig.bodyTemplate,
        nodeInputs,
        '',
      )
      : '';
    if (renderedBody) {
      const trimmed: string = renderedBody.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        body = trimmed;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        body = renderedBody;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'text/plain';
        }
      }
    }
  }
  if (sideEffectControl?.idempotencyKey && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = sideEffectControl.idempotencyKey;
  }
  const fetchInit: RequestInit = {
    method: httpConfig.method,
    headers,
  };
  if (body !== undefined) {
    fetchInit.body = body;
  }
  if (abortSignal) {
    fetchInit.signal = abortSignal;
  }
  try {
    const res: Response = await fetchWithOutboundUrlPolicy(resolvedUrl, {
      ...fetchInit,
      maxRedirects: 5,
    });
    let data: unknown = null;
    if (httpConfig.responseMode === 'status') {
      data = res.status;
    } else if (httpConfig.responseMode === 'text') {
      data = await res.text();
    } else {
      try {
        data = (await res.json()) as unknown;
      } catch {
        data = await res.text();
      }
    }
    let resolvedValue: unknown = data;
    if (httpConfig.responsePath) {
      const pathValue: unknown = getValueAtMappingPath(data, httpConfig.responsePath);
      resolvedValue = pathValue === undefined ? data : pathValue;
    }
    executed.http.add(node.id);
    return {
      value: resolvedValue,
      bundle: {
        ok: res.ok,
        status: res.status,
        url: resolvedUrl,
        data: resolvedValue,
      },
    };
  } catch (error: unknown) {
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    if (error instanceof OutboundUrlPolicyError) {
      reportAiPathsError(
        error,
        {
          action: 'httpOutboundPolicy',
          nodeId: node.id,
          url: resolvedUrl,
          reason: error.decision.reason,
          hostname: error.decision.hostname,
        },
        'Blocked outbound URL by policy:'
      );
      return {
        value: null,
        bundle: {
          ok: false,
          status: 0,
          url: resolvedUrl,
          route: 'blocked_outbound_url',
          error: `Blocked outbound URL (${error.decision.reason ?? 'policy_violation'})`,
        },
      };
    }
    reportAiPathsError(
      error,
      { action: 'httpFetch', url: resolvedUrl, nodeId: node.id },
      'HTTP fetch failed:',
    );
    return {
      value: null,
      bundle: {
        ok: false,
        status: 0,
        url: resolvedUrl,
        error: 'Fetch failed',
      },
    };
  }
};
