/**
 * Agent API Client
 * HTTP client for Agent Service (VITE_AGENT_ENDPOINT)
 */

import { createAuthHeaders, ApiError } from './base-client';
import { handleGlobalError } from '../../utils/errorHandler';
import i18n from '../../i18n';

/**
 * Check if API debugging is enabled
 */
const isDebugEnabled = (): boolean => {
  return import.meta.env.DEV || import.meta.env.VITE_API_DEBUG === 'true';
};

/**
 * Log API request start
 */
const logRequestStart = (method: string, url: string): void => {
  if (isDebugEnabled()) {
    console.log(`🚀 ${method} ${url}`);
  }
};

/**
 * Log API request success
 */
const logRequestSuccess = (method: string, url: string, status: number): void => {
  if (isDebugEnabled()) {
    console.log(`✅ ${method} ${url} -> ${status}`);
  }
};

/**
 * Log API request error
 */
const logRequestError = (method: string, url: string, error: unknown): void => {
  if (isDebugEnabled()) {
    console.error('💥 %s %s failed:', method, url, error);
  }
};

/**
 * Get Agent Service endpoint URL
 */
export const getAgentEndpoint = (): string => {
  return import.meta.env.VITE_AGENT_ENDPOINT || '';
};

/**
 * Encode ARN in Agent URL for AgentCore Runtime
 * @param url - URL to encode
 * @returns Encoded URL
 */
function encodeAgentUrl(url: string): string {
  if (url.includes('bedrock-agentcore') && url.includes('/runtimes/arn:')) {
    return url.replace(/\/runtimes\/(arn:[^/]+\/[^/]+)\//, (_match: string, arn: string) => {
      return `/runtimes/${encodeURIComponent(arn)}/`;
    });
  }
  return url;
}

/**
 * Make request to Agent Service with automatic 401 retry
 * @param options - Fetch options
 * @param isRetry - Whether this is a retry attempt (internal use)
 * @returns Response object (not JSON, for streaming support)
 */
export async function agentRequest(options: RequestInit = {}, isRetry = false): Promise<Response> {
  const method = options.method || 'POST';
  const url = encodeAgentUrl(getAgentEndpoint());

  try {
    logRequestStart(method, url);

    const headers = await createAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    logRequestSuccess(method, url, response.status);

    // On 401, attempt token refresh and retry once
    if (response.status === 401 && !isRetry) {
      console.warn(`⚠️ 401 on agent request, attempting token refresh and retry...`);
      const error = new ApiError('Unauthorized', 401, 'Unauthorized', {
        message: i18n.t('error.unauthorized'),
      });
      await handleGlobalError(error); // This triggers token refresh

      // Retry with fresh token
      return agentRequest(options, true);
    }

    // If still 401 on retry, throw and force logout
    if (response.status === 401) {
      const error = new ApiError('Unauthorized', 401, 'Unauthorized', {
        message: i18n.t('error.unauthorized'),
      });
      await handleGlobalError(error, true); // skipRefreshAttempt = true
      throw error;
    }

    return response;
  } catch (error) {
    logRequestError(method, url, error);

    // Handle global errors (skip refresh on retry to avoid infinite loop)
    if (error instanceof Error && error.message !== 'Unauthorized') {
      await handleGlobalError(error, isRetry);
    }

    throw error;
  }
}

/**
 * Get agent configuration
 * @returns Agent endpoint configuration
 */
export function getAgentConfig() {
  return {
    endpoint: getAgentEndpoint(),
  };
}

/**
 * Test agent connection
 * @returns Connection status
 */
export async function testAgentConnection(): Promise<boolean> {
  try {
    let baseEndpoint = getAgentEndpoint()
      .replace('/invocations', '')
      .replace('?qualifier=DEFAULT', '');

    if (baseEndpoint.includes('bedrock-agentcore') && baseEndpoint.includes('/runtimes/arn:')) {
      baseEndpoint = baseEndpoint.replace(
        /\/runtimes\/(arn:[^/]+\/[^/]+)\//,
        (_match: string, arn: string) => {
          return `/runtimes/${encodeURIComponent(arn)}/`;
        }
      );
    }

    const response = await fetch(`${baseEndpoint}/ping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
