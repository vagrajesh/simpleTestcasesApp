import { getServiceNowConfig } from './config.js';

const TOKEN_PATH = '/oauth_token.do';
const TIMEOUT_MS = 30_000;
// Refresh slightly before actual expiry so an in-flight request never races a dead token.
const TOKEN_REFRESH_SKEW_MS = 60_000;

let cachedToken = null; // { accessToken, expiresAt }

/** Returns a masked representation of a token safe for logging. */
function maskToken(token) {
  if (!token) return '(none)';
  if (token.length < 8) return '***';
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

function requireConfig() {
  const config = getServiceNowConfig();
  if (!config.instanceUrl || !config.clientId || !config.clientSecret) {
    throw new Error(
      'ServiceNow is not configured. Set SERVICENOW_INSTANCE_URL, SERVICENOW_CLIENT_ID, ' +
      'and SERVICENOW_CLIENT_SECRET in server .env'
    );
  }
  return config;
}

function baseUrl(instanceUrl) {
  return instanceUrl.replace(/\/+$/, '');
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Exchanges client_id/client_secret for a bearer token via OAuth2 client_credentials. */
async function requestAccessToken() {
  const { instanceUrl, clientId, clientSecret } = requireConfig();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response;
  try {
    response = await fetchWithTimeout(`${baseUrl(instanceUrl)}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || /abort/i.test(err.message);
    throw new Error(isTimeout ? 'ServiceNow OAuth token request timed out' : `ServiceNow OAuth token request failed: ${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ServiceNow OAuth token request failed with ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('ServiceNow OAuth response did not include an access_token');
  }

  const expiresInMs = (Number(data.expires_in) || 1800) * 1000;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(expiresInMs - TOKEN_REFRESH_SKEW_MS, 0),
  };

  console.log(`[servicenow] obtained access token=${maskToken(cachedToken.accessToken)}, ttl=${Math.round(expiresInMs / 1000)}s`);
  return cachedToken.accessToken;
}

async function getAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }
  return requestAccessToken();
}

async function snRequest(method, path, { query, body } = {}) {
  const { instanceUrl } = requireConfig();
  const url = new URL(`${baseUrl(instanceUrl)}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    }
  }

  const doRequest = async (token) => {
    try {
      return await fetchWithTimeout(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || /abort/i.test(err.message);
      throw new Error(isTimeout ? `ServiceNow request to ${path} timed out` : `ServiceNow request to ${path} failed: ${err.message}`);
    }
  };

  let token = await getAccessToken();
  let response = await doRequest(token);

  // Token may have been revoked or our cached expiry was optimistic — refresh once and retry.
  if (response.status === 401) {
    token = await getAccessToken({ forceRefresh: true });
    response = await doRequest(token);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ServiceNow API responded with ${response.status}: ${text.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function snGet(path, query) {
  return snRequest('GET', path, { query });
}

export function snPost(path, body) {
  return snRequest('POST', path, { body });
}

export function snPatch(path, body) {
  return snRequest('PATCH', path, { body });
}
