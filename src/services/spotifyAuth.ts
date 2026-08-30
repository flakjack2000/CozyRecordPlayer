import { SpotifyAuthTokens, SpotifyUserProfile } from '../types';

const CLIENT_ID_STORAGE_KEY = 'vinyl_spotify_client_id';
const TOKENS_STORAGE_KEY = 'vinyl_spotify_tokens';
const VERIFIER_STORAGE_KEY = 'vinyl_spotify_code_verifier';

// Helper: Generate high-entropy cryptographic random string
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Helper: Base64URL encode buffer
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: SHA256 digest
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

export class SpotifyAuthService {
  private static cachedClientId: string = '';

  // Set or get Client ID
  public static async getClientId(): Promise<string> {
    if (this.cachedClientId) return this.cachedClientId;
    
    // Check localStorage first
    const stored = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (stored) {
      this.cachedClientId = stored;
      return stored;
    }

    // Otherwise query server config
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.spotifyClientId) {
          this.cachedClientId = config.spotifyClientId;
          return config.spotifyClientId;
        }
      }
    } catch (e) {
      console.warn('Could not fetch server spotify client config');
    }

    return '';
  }

  public static setClientId(clientId: string) {
    this.cachedClientId = clientId.trim();
    if (this.cachedClientId) {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, this.cachedClientId);
    } else {
      localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    }
  }

  public static getStoredTokens(): SpotifyAuthTokens | null {
    try {
      const item = localStorage.getItem(TOKENS_STORAGE_KEY);
      if (!item) return null;
      const tokens: SpotifyAuthTokens = JSON.parse(item);
      return tokens;
    } catch (e) {
      return null;
    }
  }

  public static saveTokens(accessToken: string, expiresInSeconds: number, refreshToken?: string) {
    const existing = this.getStoredTokens();
    const tokens: SpotifyAuthTokens = {
      accessToken,
      refreshToken: refreshToken || existing?.refreshToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  }

  public static clearAuth() {
    localStorage.removeItem(TOKENS_STORAGE_KEY);
    localStorage.removeItem(VERIFIER_STORAGE_KEY);
  }

  public static getValidAccessToken(): string | null {
    const tokens = this.getStoredTokens();
    if (!tokens) return null;
    // Buffer of 60 seconds
    if (Date.now() > tokens.expiresAt - 60000) {
      return null; // needs refresh
    }
    return tokens.accessToken;
  }

  public static getRedirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  }

  // Initiate Spotify OAuth PKCE Flow
  public static async loginWithSpotify(customClientId?: string): Promise<{ success: boolean; error?: string }> {
    const clientId = customClientId || (await this.getClientId());
    if (!clientId) {
      return { success: false, error: 'Spotify Client ID is required.' };
    }

    this.setClientId(clientId);

    // 1. Generate code verifier and code challenge
    const verifier = generateRandomString(64);
    localStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);

    const redirectUri = this.getRedirectUri();
    const scope = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing'
    ].join(' ');

    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scope,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      show_dialog: 'true',
    });

    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${authParams.toString()}`;

    // 2. Open popup directly to Spotify Authorization URL as required by OAuth iframe guidelines
    const popupWidth = 540;
    const popupHeight = 720;
    const left = window.screenX + (window.outerWidth - popupWidth) / 2;
    const top = window.screenY + (window.outerHeight - popupHeight) / 2;

    const popup = window.open(
      spotifyAuthUrl,
      'spotify_oauth_window',
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=1`
    );

    if (!popup) {
      return { success: false, error: 'Popup was blocked by browser. Please allow popups for this site.' };
    }

    // 3. Return promise waiting for message from popup
    return new Promise((resolve) => {
      const handleMessage = async (event: MessageEvent) => {
        // Validate origin
        const origin = event.origin;
        if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
          return;
        }

        if (event.data && event.data.type === 'SPOTIFY_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          if (event.data.error) {
            resolve({ success: false, error: event.data.error });
            return;
          }

          const authCode = event.data.code;
          if (!authCode) {
            resolve({ success: false, error: 'No authorization code received.' });
            return;
          }

          // Exchange authCode + verifier for tokens
          try {
            const storedVerifier = localStorage.getItem(VERIFIER_STORAGE_KEY) || verifier;
            const tokenRes = await fetch('/api/spotify/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                grant_type: 'authorization_code',
                code: authCode,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: storedVerifier,
              }),
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok || tokenData.error) {
              resolve({
                success: false,
                error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization token.',
              });
              return;
            }

            this.saveTokens(tokenData.access_token, tokenData.expires_in, tokenData.refresh_token);
            resolve({ success: true });
          } catch (err: any) {
            resolve({ success: false, error: err.message || 'Token exchange failed.' });
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout safety check if popup was closed manually
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setTimeout(() => {
            if (!SpotifyAuthService.getStoredTokens()) {
              window.removeEventListener('message', handleMessage);
              resolve({ success: false, error: 'Spotify authorization window was closed.' });
            }
          }, 1000);
        }
      }, 1000);
    });
  }

  // Refresh token
  public static async refreshAccessToken(): Promise<string | null> {
    const tokens = this.getStoredTokens();
    if (!tokens || !tokens.refreshToken) {
      return null;
    }

    const clientId = await this.getClientId();
    try {
      const res = await fetch('/api/spotify/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: clientId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.warn('Token refresh failed:', data);
        return null;
      }

      this.saveTokens(data.access_token, data.expires_in, data.refresh_token);
      return data.access_token;
    } catch (e) {
      console.error('Failed refreshing token:', e);
      return null;
    }
  }
}
