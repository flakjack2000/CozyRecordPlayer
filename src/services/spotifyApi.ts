import { Album, Track, SpotifyUserProfile, VinylVariantType } from '../types';
import { SpotifyAuthService } from './spotifyAuth';

const VINYL_VARIANTS: VinylVariantType[] = ['black-180g', 'amber', 'ruby', 'sapphire', 'marble'];

function getVariantForIndex(i: number, seed: string): VinylVariantType {
  let hash = 0;
  for (let c = 0; c < seed.length; c++) {
    hash = seed.charCodeAt(c) + ((hash << 5) - hash);
  }
  const index = Math.abs((hash + i) % VINYL_VARIANTS.length);
  return VINYL_VARIANTS[index];
}

function getLabelColorForIndex(i: number): string {
  const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];
  return colors[i % colors.length];
}

export class SpotifyApiService {
  private static async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    let token = SpotifyAuthService.getValidAccessToken();
    if (!token) {
      token = await SpotifyAuthService.refreshAccessToken();
    }

    if (!token) {
      throw new Error('Not authenticated with Spotify.');
    }

    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      // Retry once after token refresh
      const refreshedToken = await SpotifyAuthService.refreshAccessToken();
      if (refreshedToken) {
        const retryRes = await fetch(`https://api.spotify.com/v1${endpoint}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${refreshedToken}`,
          },
        });
        if (!retryRes.ok) {
          throw new Error(`Spotify API error: ${retryRes.statusText}`);
        }
        return retryRes.status === 204 ? null : retryRes.json();
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.error?.message || err.message || `API error: ${res.status}`);
    }

    return res.status === 204 ? null : res.json();
  }

  // Get current Spotify user profile
  public static async getUserProfile(): Promise<SpotifyUserProfile> {
    const data = await this.fetchWithAuth('/me');
    return {
      id: data.id,
      displayName: data.display_name || data.id,
      email: data.email || '',
      avatarUrl: data.images?.[0]?.url,
      product: data.product || 'unknown',
      uri: data.uri,
    };
  }

  // Transform Spotify Album Object into our rich Vinyl Album interface
  public static mapSpotifyAlbum(item: any, index: number = 0): Album {
    const images = item.images || [];
    const coverUrl = images[0]?.url || images[1]?.url || images[2]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';
    const releaseYear = item.release_date ? item.release_date.split('-')[0] : '2024';
    const artist = item.artists?.map((a: any) => a.name).join(', ') || 'Various Artists';
    const genres = item.genres?.length ? item.genres[0] : 'Vinyl Master';
    
    // Map tracks
    const rawTracks = item.tracks?.items || [];
    const tracks: Track[] = rawTracks.map((t: any, tIndex: number) => ({
      id: t.id || `track-${tIndex}`,
      title: t.name,
      artist: t.artists?.map((a: any) => a.name).join(', ') || artist,
      durationMs: t.duration_ms || 180000,
      trackNumber: t.track_number || tIndex + 1,
      previewUrl: t.preview_url || undefined,
      spotifyUri: t.uri,
      side: (t.track_number || tIndex + 1) <= Math.ceil(rawTracks.length / 2) ? 'A' : 'B',
    }));

    return {
      id: item.id,
      title: item.name,
      artist,
      releaseYear,
      genre: genres,
      coverUrl,
      spineColor: item.label ? '#332722' : '#222222',
      vinylVariant: getVariantForIndex(index, item.id || item.name),
      labelColor: getLabelColorForIndex(index),
      speed: item.album_type === 'single' ? 45 : 33,
      catalogNumber: `SP-${item.id?.substring(0, 6)?.toUpperCase() || 'LP-101'}`,
      linerNotes: `${item.total_tracks || tracks.length} tracks • Released in ${releaseYear} on ${item.label || 'Spotify Audio Records'} • Stereo 33⅓ RPM High-Fidelity Recording.`,
      tracks,
      spotifyUri: item.uri,
      isSpotify: true,
      isPlaylist: false,
      type: 'album',
    };
  }

  // Get User's Saved Albums
  public static async getUserSavedAlbums(limit: number = 50): Promise<Album[]> {
    const data = await this.fetchWithAuth(`/me/albums?limit=${limit}`);
    return (data.items || []).map((saved: any, i: number) => this.mapSpotifyAlbum(saved.album, i));
  }

  // Get User's Playlists as Record compilations
  public static async getUserPlaylists(limit: number = 50): Promise<Album[]> {
    const data = await this.fetchWithAuth(`/me/playlists?limit=${limit}`);
    return (data.items || []).map((p: any, i: number) => {
      const coverUrl = p.images?.[0]?.url || p.images?.[1]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80';
      return {
        id: p.id,
        title: p.name,
        artist: `Curated by ${p.owner?.display_name || 'Collector'}`,
        releaseYear: 'Mixtape LP',
        genre: 'Custom Playlist',
        coverUrl,
        spineColor: '#1e3a8a',
        vinylVariant: getVariantForIndex(i, p.id),
        labelColor: getLabelColorForIndex(i),
        speed: 33,
        catalogNumber: `PL-${p.id.substring(0, 5).toUpperCase()}`,
        linerNotes: p.description || `${p.tracks?.total || 0} tracks compiled from your private Spotify crate.`,
        tracks: [], // Loaded on demand
        spotifyUri: p.uri,
        isSpotify: true,
        isPlaylist: true,
        type: 'playlist',
      };
    });
  }

  // Get User's Playlist Tracks
  public static async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const data = await this.fetchWithAuth(`/playlists/${playlistId}/tracks?limit=50`);
    return (data.items || []).map((item: any, tIndex: number) => {
      const t = item.track;
      if (!t) return null;
      return {
        id: t.id || `pl-track-${tIndex}`,
        title: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || 'Various Artists',
        durationMs: t.duration_ms || 180000,
        trackNumber: tIndex + 1,
        previewUrl: t.preview_url || undefined,
        spotifyUri: t.uri,
        side: (tIndex + 1) <= 6 ? 'A' : 'B',
      };
    }).filter(Boolean) as Track[];
  }

  // Get User's Recently Played
  public static async getRecentlyPlayedAlbums(): Promise<Album[]> {
    const data = await this.fetchWithAuth('/me/player/recently-played?limit=30');
    const seen = new Set<string>();
    const albums: Album[] = [];

    (data.items || []).forEach((item: any, i: number) => {
      const albumObj = item.track?.album;
      if (albumObj && !seen.has(albumObj.id)) {
        seen.add(albumObj.id);
        albums.push(SpotifyApiService.mapSpotifyAlbum(albumObj, i));
      }
    });

    return albums;
  }

  // Search Spotify Albums
  public static async searchAlbums(query: string): Promise<Album[]> {
    if (!query.trim()) return [];
    const encoded = encodeURIComponent(query);
    const data = await this.fetchWithAuth(`/search?type=album&limit=24&q=${encoded}`);
    return (data.albums?.items || []).map((alb: any, i: number) => this.mapSpotifyAlbum(alb, i));
  }

  // Get specific album details with all tracks
  public static async getAlbumDetails(albumId: string): Promise<Album> {
    const data = await this.fetchWithAuth(`/albums/${albumId}`);
    return this.mapSpotifyAlbum(data, 0);
  }

  // Playback control via Spotify Connect API
  public static async playSpotifyTrack(spotifyUri: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
    const body = spotifyUri.startsWith('spotify:track:')
      ? { uris: [spotifyUri] }
      : { context_uri: spotifyUri };

    await this.fetchWithAuth(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  public static async pauseSpotify(): Promise<void> {
    await this.fetchWithAuth('/me/player/pause', { method: 'PUT' });
  }

  public static async resumeSpotify(): Promise<void> {
    await this.fetchWithAuth('/me/player/play', { method: 'PUT' });
  }

  public static async seekSpotify(positionMs: number): Promise<void> {
    await this.fetchWithAuth(`/me/player/seek?position_ms=${Math.round(positionMs)}`, { method: 'PUT' });
  }

  public static async setSpotifyVolume(volumePercent: number): Promise<void> {
    await this.fetchWithAuth(`/me/player/volume?volume_percent=${Math.round(volumePercent)}`, { method: 'PUT' });
  }
}
