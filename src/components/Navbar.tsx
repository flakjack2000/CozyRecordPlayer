import React from 'react';
import { ViewMode, SpotifyUserProfile, ThemeMode } from '../types';
import { 
  Disc3, 
  Library, 
  LayoutGrid, 
  Sparkles,
  ListMusic,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  spotifyUser: SpotifyUserProfile | null;
  onOpenSpotifyModal: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedGenre: string;
  setSelectedGenre: (g: string) => void;
  genres: string[];
  isPlaying: boolean;
  currentAlbumTitle?: string;
  onQuickJumpTurntable: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  spotifyUser,
  onOpenSpotifyModal,
  isPlaying,
  onQuickJumpTurntable,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className={`sticky top-0 z-40 w-full border-b transition-colors duration-300 ${
      theme === 'light'
        ? 'border-black/10 bg-[#f6f1ea]/90 text-stone-900 shadow-sm'
        : 'border-white/10 bg-[#0d0a08]/85 text-stone-100'
    } backdrop-blur-xl`}>
      <div className="max-w-[2400px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-14 gap-3">
          
          {/* Brand Logo: CosyVinyl */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              id="nav-brand-btn"
              onClick={onQuickJumpTurntable}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className={`relative w-8 h-8 rounded-full border flex items-center justify-center shadow-inner transition-colors ${
                theme === 'light'
                  ? 'bg-amber-100 border-amber-300 group-hover:border-amber-600'
                  : 'bg-stone-900 border-white/20 group-hover:border-amber-400'
              }`}>
                <Disc3 className={`w-4 h-4 text-amber-500 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-black animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-serif-title font-bold text-base sm:text-lg tracking-wide ${
                  theme === 'light' ? 'text-stone-900' : 'text-white'
                }`}>
                  CosyVinyl
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-full font-bold">
                  Hi-Fi
                </span>
              </div>
            </button>
          </div>

          {/* Center: View Switcher (Turntable, Albums, Playlists, Shelf) */}
          <nav className={`flex items-center p-1 rounded-full border shadow-inner ${
            theme === 'light'
              ? 'bg-stone-200/80 border-stone-300/80'
              : 'bg-stone-900/70 border-white/10'
          }`}>
            <button
              id="view-turntable-btn"
              onClick={() => setViewMode('turntable')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'turntable'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : theme === 'light'
                    ? 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
              title="Record Player"
            >
              <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
              <span>Turntable</span>
            </button>

            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : theme === 'light'
                    ? 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
              title="Album Wall & Scale View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Albums</span>
            </button>

            <button
              id="view-playlists-btn"
              onClick={() => setViewMode('playlists')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'playlists'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : theme === 'light'
                    ? 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
              title="Curated Playlists & Mixtapes"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playlists</span>
            </button>

            <button
              id="view-shelf-btn"
              onClick={() => setViewMode('shelf')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'shelf'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                  : theme === 'light'
                    ? 'text-stone-700 hover:text-stone-950 hover:bg-white/60'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
              }`}
              title="Walnut Bookshelf Spines"
            >
              <Library className="w-3.5 h-3.5" />
              <span>Shelf</span>
            </button>
          </nav>

          {/* Right Controls: Theme Toggle & Spotify Status */}
          <div className="flex items-center gap-2">
            
            {/* Global Light / Dark Mode Toggle */}
            <button
              id="btn-theme-toggle"
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                theme === 'light'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 hover:bg-amber-500/25'
                  : 'bg-stone-900/80 border-white/15 text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode (Vinyl Night)' : 'Switch to Light Mode (Warm Champagne Studio)'}
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline font-semibold">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline font-semibold">Dark</span>
                </>
              )}
            </button>

            {/* Spotify Integration Status */}
            <button
              id="btn-spotify-status"
              onClick={onOpenSpotifyModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                spotifyUser
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : theme === 'light'
                    ? 'bg-stone-200/90 text-stone-800 border-stone-300 hover:bg-stone-300'
                    : 'bg-stone-900/60 text-stone-300 border-white/10 hover:bg-stone-800 hover:text-white'
              }`}
              title="Sync Spotify Premium Account for Full Playback"
            >
              {spotifyUser ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[120px] hidden sm:inline">{spotifyUser.displayName}</span>
                  <span className="text-[10px] text-emerald-400/80 uppercase font-bold hidden md:inline">
                    {spotifyUser.product === 'premium' ? 'Premium (Full)' : spotifyUser.product}
                  </span>
                  <span className="sm:hidden">Spotify</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Connect Spotify</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
