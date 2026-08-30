// Spotify Web Playback SDK Integration for Full-Track Hi-Fi Streaming on Spotify Premium
import { SpotifyAuthService } from './spotifyAuth';

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  trackUri?: string;
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  deviceId?: string;
}

export interface SpotifyWebPlayerCallbacks {
  onReady?: (deviceId: string) => void;
  onNotReady?: (deviceId: string) => void;
  onStateChange?: (state: SpotifyPlaybackState) => void;
  onError?: (message: string) => void;
}

class SpotifyWebPlayerService {
  private player: any = null;
  private deviceId: string | null = null;
  private isConnecting = false;
  private callbacks: SpotifyWebPlayerCallbacks = {};
  private positionTickerId: any = null;
  private lastState: SpotifyPlaybackState = {
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
  };

  public setCallbacks(cbs: SpotifyWebPlayerCallbacks) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  public getDeviceId(): string | null {
    return this.deviceId;
  }

  public isPlayerReady(): boolean {
    return !!this.deviceId;
  }

  public async initPlayer(): Promise<boolean> {
    if (this.player && this.deviceId) {
      return true;
    }

    const token = SpotifyAuthService.getValidAccessToken();
    if (!token) {
      return false;
    }

    if (this.isConnecting) return false;
    this.isConnecting = true;

    return new Promise((resolve) => {
      const setup = () => {
        if (!(window as any).Spotify) {
          this.isConnecting = false;
          resolve(false);
          return;
        }

        try {
          const player = new (window as any).Spotify.Player({
            name: 'CosyVinyl Hi-Fi Turntable',
            getOAuthToken: async (cb: (token: string) => void) => {
              let currentToken = SpotifyAuthService.getValidAccessToken();
              if (!currentToken) {
                currentToken = await SpotifyAuthService.refreshAccessToken();
              }
              if (currentToken) {
                cb(currentToken);
              }
            },
            volume: 0.85,
          });

          player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('✅ Spotify Web Playback SDK ready with Device ID:', device_id);
            this.deviceId = device_id;
            this.isConnecting = false;
            if (this.callbacks.onReady) {
              this.callbacks.onReady(device_id);
            }
            resolve(true);
          });

          player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.warn('Spotify device went offline:', device_id);
            this.deviceId = null;
            if (this.callbacks.onNotReady) {
              this.callbacks.onNotReady(device_id);
            }
          });

          player.addListener('player_state_changed', (state: any) => {
            if (!state) return;

            const isPlaying = !state.paused;
            const currentTrack = state.track_window?.current_track;
            const pos = state.position || 0;
            const dur = state.duration || 180000;

            this.lastState = {
              isPlaying,
              positionMs: pos,
              durationMs: dur,
              trackUri: currentTrack?.uri,
              trackName: currentTrack?.name,
              artistName: currentTrack?.artists?.map((a: any) => a.name).join(', '),
              albumArtUrl: currentTrack?.album?.images?.[0]?.url,
              deviceId: this.deviceId || undefined,
            };

            this.startLocalPositionTracking(isPlaying, pos, dur);

            if (this.callbacks.onStateChange) {
              this.callbacks.onStateChange(this.lastState);
            }
          });

          player.addListener('initialization_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK init error:', message);
            this.isConnecting = false;
            if (this.callbacks.onError) this.callbacks.onError(message);
            resolve(false);
          });

          player.addListener('authentication_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK auth error:', message);
            this.isConnecting = false;
            if (this.callbacks.onError) this.callbacks.onError(message);
            resolve(false);
          });

          player.addListener('account_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK account error (Requires Spotify Premium):', message);
            this.isConnecting = false;
            if (this.callbacks.onError) {
              this.callbacks.onError('Spotify Web Playback requires a Spotify Premium account for full-track streaming.');
            }
            resolve(false);
          });

          player.addListener('playback_error', ({ message }: { message: string }) => {
            console.warn('Spotify SDK playback error:', message);
            if (this.callbacks.onError) this.callbacks.onError(message);
          });

          player.connect();
          this.player = player;
        } catch (e: any) {
          console.error('Failed to construct Spotify Player:', e);
          this.isConnecting = false;
          resolve(false);
        }
      };

      if ((window as any).Spotify) {
        setup();
      } else {
        (window as any).onSpotifyWebPlaybackSDKReady = () => {
          setup();
        };

        // Fallback timeout if SDK is slow to load
        setTimeout(() => {
          if (!this.deviceId && this.isConnecting) {
            this.isConnecting = false;
            resolve(false);
          }
        }, 6000);
      }
    });
  }

  private startLocalPositionTracking(isPlaying: boolean, startPos: number, duration: number) {
    if (this.positionTickerId) {
      clearInterval(this.positionTickerId);
      this.positionTickerId = null;
    }

    if (!isPlaying) return;

    let currentPos = startPos;
    this.positionTickerId = setInterval(() => {
      currentPos += 250;
      if (currentPos > duration) {
        currentPos = duration;
      }
      this.lastState.positionMs = currentPos;
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange({ ...this.lastState, positionMs: currentPos });
      }
    }, 250);
  }

  public async playSpotifyTrack(spotifyUri: string, positionMs = 0): Promise<boolean> {
    const token = SpotifyAuthService.getValidAccessToken();
    if (!token) return false;

    // Ensure player is connected
    if (!this.deviceId) {
      await this.initPlayer();
    }

    const deviceIdParam = this.deviceId ? `?device_id=${this.deviceId}` : '';
    const body: any = {
      position_ms: Math.round(positionMs),
    };

    if (spotifyUri.startsWith('spotify:track:')) {
      body.uris = [spotifyUri];
    } else {
      body.context_uri = spotifyUri;
    }

    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/play${deviceIdParam}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 204) {
        return true;
      }

      // If failed with custom device, try without device_id (activates user's existing Spotify Connect device)
      if (this.deviceId) {
        const fallbackRes = await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        return fallbackRes.ok || fallbackRes.status === 204;
      }
    } catch (e) {
      console.warn('Spotify play error:', e);
    }
    return false;
  }

  public async pause(): Promise<void> {
    if (this.player) {
      try {
        await this.player.pause();
        return;
      } catch (e) {}
    }
    const token = SpotifyAuthService.getValidAccessToken();
    if (token) {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  public async resume(): Promise<void> {
    if (this.player) {
      try {
        await this.player.resume();
        return;
      } catch (e) {}
    }
    const token = SpotifyAuthService.getValidAccessToken();
    if (token) {
      await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  public async seek(positionMs: number): Promise<void> {
    if (this.player) {
      try {
        await this.player.seek(Math.round(positionMs));
        return;
      } catch (e) {}
    }
    const token = SpotifyAuthService.getValidAccessToken();
    if (token) {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  public async setVolume(volFraction: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, volFraction));
    if (this.player) {
      try {
        await this.player.setVolume(clamped);
      } catch (e) {}
    }
  }

  public disconnect() {
    if (this.positionTickerId) {
      clearInterval(this.positionTickerId);
      this.positionTickerId = null;
    }
    if (this.player) {
      try {
        this.player.disconnect();
      } catch (e) {}
      this.player = null;
      this.deviceId = null;
    }
  }
}

export const spotifyWebPlayer = new SpotifyWebPlayerService();
