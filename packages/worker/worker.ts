import { R2Explorer } from "./dist/index.mjs";
import {
  isAuthenticated,
  redirectToLogin,
  exchangeCodeForToken,
  createSession,
  logout,
  getSession
} from "./auth";

/**
 * Candid Cloud SmartChannel v4.0 with Keycloak OIDC Authentication
 *
 * All 32 Candid Studios users can log in with their Keycloak credentials.
 * No basic auth - only authenticated users via Keycloak can access buckets.
 */

// Create R2 Explorer instance without authentication
// We'll handle auth in the wrapper below
const r2explorer = R2Explorer({
  readonly: false
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    console.log(`[AUTH v4.0] Request: ${url.pathname}`);

    // ============================================================
    // AUTHENTICATION ROUTES (public - no auth required)
    // ============================================================

    // Login route - redirect to Keycloak
    if (url.pathname === '/login') {
      console.log('[AUTH] Redirecting to Keycloak login');
      return await redirectToLogin(env);
    }

    // OAuth callback route - handle login response from Keycloak
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response('Missing authorization code', { status: 400 });
      }

      try {
        // Exchange authorization code for access token (with PKCE verifier)
        const tokenData = await exchangeCodeForToken(code, env, request);

        // Create encrypted session cookie
        const sessionCookie = await createSession(tokenData, env);

        // Clear PKCE verifier cookie and redirect to home page
        const headers = new Headers();
        headers.append('Location', '/');
        headers.append('Set-Cookie', sessionCookie);
        headers.append('Set-Cookie', 'pkce_verifier=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

        return new Response(null, {
          status: 302,
          headers: headers
        });
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        return new Response(`Authentication failed: ${error.message}`, { status: 500 });
      }
    }

    // Logout route - clear session and redirect to Keycloak logout
    if (url.pathname === '/logout') {
      return logout(env);
    }

    // ============================================================
    // PROTECTED ROUTES (require authentication)
    // ============================================================

    // Check authentication for all other routes
    console.log('[AUTH] Checking authentication...');
    const { authenticated, session } = await isAuthenticated(request, env);
    console.log(`[AUTH] Authenticated: ${authenticated}`);

    if (!authenticated) {
      console.log('[AUTH] Not authenticated - showing login page');

      // For ANY route (including assets), show login page
      return new Response(
          `<!DOCTYPE html>
<html>
<head>
  <title>R2 SmartChannel - Login</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .login-box {
      background: white;
      padding: 50px;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 450px;
    }
    h1 {
      margin: 0 0 10px 0;
      color: #333;
      font-weight: 700;
    }
    h2 {
      margin: 0 0 10px 0;
      color: #555;
      font-weight: 600;
    }
    .version {
      color: #999;
      font-size: 14px;
      margin-bottom: 20px;
    }
    p {
      color: #666;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    .login-btn {
      background: #000;
      color: white;
      padding: 15px 40px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
    }
    .login-btn:hover {
      background: #333;
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>R2 SmartChannel</h1>
    <div class="version">Version 4.1 with Keycloak SSO</div>
    <p>Please log in with your Candid Studios credentials to access R2 storage.</p>
    <a href="/login" class="login-btn">Log In with Candid Studios SSO</a>
  </div>
</body>
</html>`,
          {
            headers: { 'Content-Type': 'text/html' }
          }
        );
    }

    // ============================================================
    // USER IS AUTHENTICATED - PASS TO R2 EXPLORER
    // ============================================================

    console.log(`[AUTH] User authenticated: ${session?.user_email}`);

    // Add user info to request headers for logging/audit
    const authenticatedRequest = new Request(request, {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'X-User-Email': session?.user_email || '',
        'X-User-Name': session?.user_name || '',
      })
    });

    // Pass request to R2 Explorer
    return r2explorer.fetch(authenticatedRequest, env, ctx);
  }
};
