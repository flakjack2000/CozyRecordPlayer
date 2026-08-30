export type VinylVariantType = 
  | 'black-180g' 
  | 'emerald' 
  | 'sage' 
  | 'amber' 
  | 'ruby' 
  | 'sapphire' 
  | 'rose' 
  | 'marble' 
  | 'translucent-clear';

export type SlipmatType = 'classic-felt' | 'cork' | 'technics-dj' | 'hypnotic-strobe' | 'optical-grid';

export type TurntableLayoutPreset = 'maximized' | 'classic' | 'split';

export type ThemeMode = 'dark' | 'light';

export interface SplitExperimentConfig {
  sleeveSize: number; // px
  vinylSize: number; // px
  titleFontSize: number; // px
  trackTitleFontSize: number; // px
  sleeveOffsetX: number; // px
  sleeveOffsetY: number; // px
  sleeveRotation: number; // deg
  vinylOffsetX: number; // px
  vinylOffsetY: number; // px
  layerOrder: 'vinyl-behind' | 'vinyl-front' | 'side-by-side';
}

export interface MaximizedScaleConfig {
  turntableScale: number; // percentage (70 to 140)
  sleeveScale: number; // percentage (70 to 140)
}

export interface ClassicScaleConfig {
  turntableScale: number; // percentage (70 to 140)
  sleeveScale: number; // percentage (70 to 140)
}

export type ViewMode = 'turntable' | 'grid' | 'playlists' | 'shelf';

export type ToneArmStatus = 'resting' | 'cueing' | 'on_record' | 'returning';

export interface Track {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  trackNumber: number;
  previewUrl?: string;
  spotifyUri?: string;
  side?: 'A' | 'B';
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  releaseYear: number | string;
  genre: string;
  coverUrl: string;
  spineColor: string;
  vinylVariant: VinylVariantType;
  waxColor?: string; // hex or rgba for translucent colored vinyl
  accentColor?: string; // ambient backdrop color
  labelColor: string;
  speed: 33 | 45;
  catalogNumber: string;
  linerNotes?: string;
  gatefoldInnerUrl?: string;
  tracks: Track[];
  spotifyUri?: string;
  isSpotify?: boolean;
  isPlaylist?: boolean;
  type?: 'album' | 'playlist';
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  product: 'premium' | 'free' | 'open' | 'unknown';
  uri?: string;
}

export interface SpotifyAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp ms
}

export interface TurntableState {
  currentAlbum: Album | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  rpm: 33 | 45;
  pitchPercent: number; // -8 to +8
  toneArmStatus: ToneArmStatus;
  needleCrackleEnabled: boolean;
  needleCrackleVolume: number;
  analogWarmth: boolean;
  slipmat: SlipmatType;
  volume: number;
}
