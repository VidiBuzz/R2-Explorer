/**
 * Keycloak OIDC Authentication for Candid Cloud SmartChannel
 *
 * This module handles:
 * - OIDC login flow (redirect to Keycloak)
 * - JWT token validation
 * - Session management with encrypted cookies
 * - User logout
 */

interface Env {
  KEYCLOAK_URL: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_CLIENT_ID: string;
  KEYCLOAK_REDIRECT_URI: string;
  SESSION_SECRET: string;
}

interface SessionData {
  access_token: string;
  refresh_token?: string;
  user_email: string;
  user_name: string;
  expires_at: number;
}

/**
 * Get Keycloak OIDC well-known configuration
 */
export async function getOIDCConfig(env: Env) {
  const wellKnownUrl = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/.well-known/openid-configuration`;
  const response = await fetch(wellKnownUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC config: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Base64URL encode (RFC 4648)
 */
function base64urlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create code challenge from verifier (SHA-256)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(hash));
}

/**
 * Redirect user to Keycloak login page with PKCE
 */
export async function redirectToLogin(env: Env): Promise<Response> {
  const config = await getOIDCConfig(env);
  const state = generateState();

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(config.authorization_endpoint);
  authUrl.searchParams.set('client_id', env.KEYCLOAK_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.KEYCLOAK_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  // PKCE parameters
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Store both state and code_verifier in cookies
  // Need to use Headers API to set multiple Set-Cookie headers
  const headers = new Headers();
  headers.append('Location', authUrl.toString());
  headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`);
  headers.append('Set-Cookie', `pkce_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`);

  return new Response(null, {
    status: 302,
    headers: headers
  });
}

/**
 * Get cookie value from request
 */
function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const cookie = cookies.find(c => c.startsWith(`${name}=`));

  if (!cookie) return null;
  return cookie.split('=')[1];
}

/**
 * Exchange authorization code for access token (with PKCE)
 */
export async function exchangeCodeForToken(code: string, env: Env, request?: Request): Promise<any> {
  const config = await getOIDCConfig(env);

  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: env.KEYCLOAK_REDIRECT_URI,
    client_id: env.KEYCLOAK_CLIENT_ID,
  };

  // Add PKCE code_verifier if available
  if (request) {
    const codeVerifier = getCookie(request, 'pkce_verifier');
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }
  }

  const tokenResponse = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await tokenResponse.json();
}

/**
 * Decode JWT token (without verification - use validateToken for verification)
 */
function decodeJWT(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded);
}

/**
 * Validate JWT token with Keycloak
 */
export async function validateToken(token: string, env: Env): Promise<any> {
  try {
    const config = await getOIDCConfig(env);

    // Use Keycloak's userinfo endpoint to validate token
    const userInfoResponse = await fetch(config.userinfo_endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userInfoResponse.ok) {
      return null;
    }

    return await userInfoResponse.json();
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Create encrypted session cookie
 */
export async function createSession(tokenData: any, env: Env): Promise<string> {
  const decoded = decodeJWT(tokenData.access_token);

  const sessionData: SessionData = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    user_email: decoded.email || '',
    user_name: decoded.name || decoded.preferred_username || '',
    expires_at: decoded.exp * 1000, // Convert to milliseconds
  };

  // Encrypt session data (simple base64 encoding for now)
  // TODO: Use proper encryption with SESSION_SECRET
  const sessionString = JSON.stringify(sessionData);
  const encoded = btoa(sessionString);

  return `r2_session=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenData.expires_in || 3600}`;
}

/**
 * Get session from cookie
 */
export function getSession(request: Request): SessionData | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('r2_session='));

  if (!sessionCookie) return null;

  try {
    const encoded = sessionCookie.split('=')[1];
    const decoded = atob(encoded);
    const session: SessionData = JSON.parse(decoded);

    // Check if session is expired
    if (session.expires_at && Date.now() > session.expires_at) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session parsing error:', error);
    return null;
  }
}

/**
 * Logout user (clear session)
 */
export function logout(env: Env): Response {
  const logoutUrl = `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(env.KEYCLOAK_REDIRECT_URI)}`;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': logoutUrl,
      'Set-Cookie': 'r2_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(request: Request, env: Env): Promise<{ authenticated: boolean; session: SessionData | null }> {
  const session = getSession(request);

  if (!session) {
    return { authenticated: false, session: null };
  }

  // Validate token with Keycloak
  const userInfo = await validateToken(session.access_token, env);

  if (!userInfo) {
    return { authenticated: false, session: null };
  }

  return { authenticated: true, session };
}
