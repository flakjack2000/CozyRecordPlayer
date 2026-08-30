import React from 'react';
import { Album, ThemeMode } from '../types';
import { Play, Info, Disc3, ZoomIn, ZoomOut, SlidersHorizontal, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ArtworkImage } from './ArtworkImage';

interface GridViewProps {
  albums: Album[];
  selectedAlbum: Album | null;
  onSelectAlbum: (album: Album) => void;
  onPlayAlbum: (album: Album) => void;
  onInspectAlbum: (album: Album) => void;
  scaleLevel: number;
  onScaleChange: (scale: number) => void;
  viewType?: 'albums' | 'playlists';
  theme?: ThemeMode;
}

export const GridView: React.FC<GridViewProps> = ({
  albums,
  selectedAlbum,
  onSelectAlbum,
  onPlayAlbum,
  onInspectAlbum,
  scaleLevel,
  onScaleChange,
  viewType = 'albums',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Determine Tab-Specific Background Gradient
  const tabBgClass = viewType === 'playlists'
    ? (isLight ? 'tab-gradient-playlists-light' : 'tab-gradient-playlists-dark')
    : (isLight ? 'tab-gradient-albums-light' : 'tab-gradient-albums-dark');

  if (albums.length === 0) {
    return (
      <div className={`w-full min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center p-8 ${tabBgClass}`}>
        <Disc3 className="w-14 h-14 text-amber-500 mb-3 animate-spin" style={{ animationDuration: '6s' }} />
        <h3 className={`text-lg font-serif-title font-semibold ${isLight ? 'text-stone-900' : 'text-amber-200'}`}>
          {viewType === 'playlists' ? 'No playlists in display' : 'No records in display'}
        </h3>
        <p className={`text-xs mt-1 ${isLight ? 'text-stone-600' : 'text-stone-500'}`}>Try resetting your search query or filter tags.</p>
      </div>
    );
  }

  // Determine grid template class based on scale level 1 to 6
  const getGridColsClass = () => {
    switch (scaleLevel) {
      case 1:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-4 sm:gap-6';
      case 2:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 sm:gap-8';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 sm:gap-10';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-10 sm:gap-14';
      case 5:
        return 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-12 sm:gap-16';
      case 6:
      default:
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-14 sm:gap-20 max-w-[2800px] mx-auto';
    }
  };

  const getScaleLabel = () => {
    switch (scaleLevel) {
      case 1:
        return 'Compact Matrix (S)';
      case 2:
        return 'Standard Gallery (M)';
      case 3:
        return 'Expanded Wall (L)';
      case 4:
        return 'Grand Showcase (XL)';
      case 5:
        return 'Colossal Exhibition (2XL)';
      case 6:
        return 'Monumental 1:1 Gatefold (3XL)';
      default:
        return 'Standard';
    }
  };

  return (
    <div className={`w-full min-h-[calc(100vh-3.5rem)] py-6 sm:py-8 px-4 sm:px-8 lg:px-12 transition-all ${tabBgClass}`}>
      <div className="max-w-[3400px] mx-auto">
        
        {/* Interactive Toolbar: Stats & Scale Slider */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b text-xs font-mono ${
          isLight ? 'border-stone-300' : 'border-white/10'
        }`}>
          
          {/* Left Stats */}
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className={`font-bold tracking-wider uppercase ${isLight ? 'text-stone-900' : 'text-amber-100'}`}>
              {viewType === 'playlists' 
                ? `CURATED PLAYLIST CRATE • ${albums.length} MIXTAPES & PLAYLISTS`
                : `COLLECTOR ALBUM WALL • ${albums.length} 3D PHYSICAL GATEFOLDS`}
            </span>
            <span className="text-stone-500 hidden md:inline">•</span>
            <span className={`hidden md:inline font-semibold ${isLight ? 'text-amber-800' : 'text-amber-400/90'}`}>
              {viewType === 'playlists' ? 'Curated Vinyl Tracklists' : 'Audiophile 12" Vinyl Gallery'}
            </span>
          </div>

          {/* Right: Album Wall Zoom & Scale Slider */}
          <div className={`flex items-center gap-3 backdrop-blur-xl border px-4 py-2 rounded-2xl shadow-xl ${
            isLight 
              ? 'bg-white/90 border-stone-300/80 text-stone-800'
              : 'bg-stone-900/90 border-white/15 text-stone-100'
          }`}>
            <div className="flex items-center gap-1.5 text-stone-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
              <span className={`text-[11px] font-semibold ${isLight ? 'text-stone-700' : 'text-stone-300'}`}>Scale:</span>
              <span className="text-amber-500 text-[11px] font-bold min-w-[135px]">{getScaleLabel()}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-scale-down"
                onClick={() => onScaleChange(Math.max(1, scaleLevel - 1))}
                disabled={scaleLevel <= 1}
                className={`p-1 rounded-lg disabled:opacity-30 transition-colors ${
                  isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-white'
                }`}
                title="Shrink Album Covers"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                id="input-album-scale-slider"
                type="range"
                min={1}
                max={6}
                step={1}
                value={scaleLevel}
                onChange={(e) => onScaleChange(parseInt(e.target.value))}
                className={`w-28 sm:w-44 accent-amber-500 h-1.5 rounded-lg cursor-pointer ${
                  isLight ? 'bg-stone-300' : 'bg-stone-800'
                }`}
                title="Adjust Album Cover Sizing (Up to Monumental Scale)"
              />

              <button
                id="btn-scale-up"
                onClick={() => onScaleChange(Math.min(6, scaleLevel + 1))}
                disabled={scaleLevel >= 6}
                className={`p-1 rounded-lg disabled:opacity-30 transition-colors ${
                  isLight ? 'text-stone-600 hover:text-stone-950' : 'text-stone-400 hover:text-white'
                }`}
                title="Enlarge Album Covers (Massive)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className={`hidden lg:flex items-center gap-1 pl-2 border-l ${
              isLight ? 'border-stone-300' : 'border-white/10'
            }`}>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  onClick={() => onScaleChange(level)}
                  className={`w-6 h-6 rounded-md text-[10px] font-mono transition-all ${
                    scaleLevel === level
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : isLight
                        ? 'text-stone-600 hover:text-stone-950 hover:bg-stone-200'
                        : 'text-stone-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Scale level ${level}`}
                >
                  {level === 1 ? 'S' : level === 2 ? 'M' : level === 3 ? 'L' : level === 4 ? 'XL' : level === 5 ? '2X' : '3X'}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Fluid Ultrawide Grid of Physical 3D Albums */}
      <div className={`grid ${getGridColsClass()} transition-all duration-300`}>
        {albums.map((album, index) => {
          const isSelected = selectedAlbum?.id === album.id;
          const waxColor = album.waxColor || (
            album.vinylVariant === 'emerald' ? '#40916c' :
            album.vinylVariant === 'sage' ? '#52b788' :
            album.vinylVariant === 'rose' ? '#be123c' :
            album.vinylVariant === 'amber' ? '#d97706' :
            album.vinylVariant === 'sapphire' ? '#2563eb' :
            album.vinylVariant === 'ruby' ? '#dc2626' :
            '#1c1917'
          );

          // Subtle organic physical angle offset applied STRICTLY to artwork container
          const tiltDegrees = ((index % 5) - 2) * 1.2; // -2.4 to +2.4 degrees

          return (
            <motion.div
              key={album.id}
              layout
              className="perspective-1000"
            >
              {/* Outer Card Container remains square/unrotated for clean typography alignment */}
              <div
                className={`group relative bg-gradient-to-b from-stone-900/90 to-stone-950/95 backdrop-blur-xl rounded-3xl ${
                  scaleLevel === 1 ? 'p-2' : 
                  scaleLevel === 2 ? 'p-3.5' : 
                  scaleLevel === 3 ? 'p-5' : 
                  scaleLevel === 4 ? 'p-6 sm:p-7' : 
                  scaleLevel === 5 ? 'p-7 sm:p-9' : 
                  'p-8 sm:p-12'
                } border transition-all duration-300 ${
                  isSelected
                    ? 'border-amber-500 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.35),0_15px_30px_rgba(0,0,0,0.9)] ring-2 ring-amber-500/50 scale-[1.02]'
                    : 'border-white/10 hover:border-white/35 hover:scale-[1.015] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_12px_28px_-6px_rgba(0,0,0,0.85)] hover:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.98),0_20px_40px_rgba(0,0,0,0.9)]'
                }`}
              >
                {/* 3D Physical Cardboard Jacket Assembly with organic tilt applied ONLY here */}
                <div 
                  className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-stone-950 cursor-pointer transform-gpu transition-all duration-500 group-hover:scale-[1.03] group-hover:rotate-0"
                  onClick={() => onPlayAlbum(album)}
                  style={{
                    transform: `rotate(${tiltDegrees}deg)`,
                    boxShadow: '0 20px 45px -10px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.15), 0 5px 15px rgba(0,0,0,0.8)'
                  }}
                >
                  {/* Physical 3D Cardboard Thickness Spine on the Left */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-stone-900 via-stone-800 to-transparent z-20 pointer-events-none opacity-80 border-r border-black/50" />
                  
                  {/* Physical Bevel Highlighting (Top & Right) */}
                  <div className="absolute inset-0 rounded-2xl border-t border-l border-white/25 z-20 pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl border-b-2 border-r-2 border-black/80 z-20 pointer-events-none" />

                  {/* Resilient Album Cover Artwork with Multi-Tier Fallback */}
                  <ArtworkImage
                    src={album.coverUrl}
                    alt={album.title}
                    title={album.title}
                    artist={album.artist}
                    catalogNumber={album.catalogNumber}
                    waxColor={waxColor}
                    fallbackColor={album.spineColor || '#1c1917'}
                  />

                  {/* Cardboard Texture Sheen, Light Glare & Ring Wear Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/20 pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />

                  {/* Sliding Wax Disc on Hover */}
                  {scaleLevel >= 2 && (
                    <div className="absolute top-2 -right-24 w-3/4 h-3/4 rounded-full -z-10 shadow-2xl opacity-0 group-hover:opacity-100 group-hover:right-3 transition-all duration-500 pointer-events-none">
                      <div 
                        className="w-full h-full rounded-full flex items-center justify-center animate-spin"
                        style={{
                          backgroundColor: waxColor,
                          boxShadow: `0 0 35px ${waxColor}80, 0 15px 35px rgba(0,0,0,0.9)`,
                          animationDuration: '4.5s',
                        }}
                      >
                        <div className="absolute inset-0 rounded-full vinyl-grooves-overlay opacity-80" />
                        <div 
                          className="w-1/3 h-1/3 rounded-full flex items-center justify-center shadow-inner border border-black/40"
                          style={{ backgroundColor: album.labelColor || '#1e293b' }}
                        >
                          <span className="text-[9px] sm:text-[11px] font-bold text-white font-mono">{album.speed || 33}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Play / Inspect Action Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-stone-950/55 backdrop-blur-[3px] transition-opacity duration-300 gap-3 z-30">
                    <button
                      id={`grid-play-${album.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayAlbum(album);
                      }}
                      className={`rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-2xl transition-transform hover:scale-110 active:scale-95 flex items-center justify-center ${
                        scaleLevel === 1 ? 'p-2' : 
                        scaleLevel >= 5 ? 'p-6 sm:p-7' : 
                        scaleLevel === 4 ? 'p-5' : 'p-3.5'
                      }`}
                      title="Drop Needle & Spin on Turntable"
                    >
                      <Play className={`${scaleLevel === 1 ? 'w-4 h-4' : scaleLevel >= 5 ? 'w-10 h-10' : scaleLevel === 4 ? 'w-7 h-7' : 'w-5 h-5'} fill-stone-950`} />
                    </button>

                    <button
                      id={`grid-inspect-${album.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectAlbum(album);
                      }}
                      className={`rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-white/20 shadow-2xl transition-transform hover:scale-110 flex items-center justify-center ${
                        scaleLevel === 1 ? 'p-2' : 
                        scaleLevel >= 5 ? 'p-6 sm:p-7' : 
                        scaleLevel === 4 ? 'p-5' : 'p-3.5'
                      }`}
                      title="View Gatefold & Liner Notes"
                    >
                      <Info className={`${scaleLevel === 1 ? 'w-4 h-4' : scaleLevel >= 5 ? 'w-10 h-10' : scaleLevel === 4 ? 'w-7 h-7' : 'w-5 h-5'} text-amber-400`} />
                    </button>
                  </div>

                  {/* Top Badge: Catalog Code & Year */}
                  {scaleLevel >= 2 && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-stone-950/85 backdrop-blur-md border border-white/15 text-[11px] font-mono text-stone-200 font-semibold shadow-lg z-20">
                      {album.releaseYear} • {album.catalogNumber}
                    </div>
                  )}

                  {/* Vinyl Variant Chip */}
                  {scaleLevel >= 2 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-950/90 backdrop-blur-md border border-white/15 text-[11px] font-mono text-stone-200 shadow-lg z-20">
                      <span 
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-white/30 shadow" 
                        style={{ backgroundColor: waxColor }} 
                      />
                      <span className="capitalize font-semibold text-amber-300">
                        {album.vinylVariant.replace('-', ' ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Artist Information with Distinct Typography and Glowing Accent Color */}
                <div className="text-left">
                  <h4 className={`font-serif-title font-bold tracking-tight text-amber-100 group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] truncate ${
                    scaleLevel === 1 ? 'text-xs' : 
                    scaleLevel === 2 ? 'text-sm' : 
                    scaleLevel === 3 ? 'text-base' : 
                    scaleLevel === 4 ? 'text-xl sm:text-2xl' : 
                    scaleLevel === 5 ? 'text-2xl sm:text-3xl' : 
                    'text-3xl sm:text-4xl'
                  }`}>
                    {album.title}
                  </h4>
                  
                  <p className={`text-stone-300 font-medium truncate mt-1 ${
                    scaleLevel === 1 ? 'text-[11px]' : 
                    scaleLevel === 2 ? 'text-xs' : 
                    scaleLevel === 3 ? 'text-sm' : 
                    scaleLevel === 4 ? 'text-base sm:text-lg' : 
                    scaleLevel === 5 ? 'text-lg sm:text-xl' : 
                    'text-xl sm:text-2xl'
                  }`}>
                    <span className="text-stone-200">{album.artist}</span>
                  </p>

                  {/* Extra track preview list for Colossal & Monumental scales */}
                  {scaleLevel >= 5 && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400/90 mb-2">
                        <Music2 className="w-3.5 h-3.5" />
                        <span>Featured Tracks:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-stone-300 font-mono">
                        {album.tracks.slice(0, 4).map((t, idx) => (
                          <div key={t.id || idx} className="truncate bg-white/5 px-2.5 py-1 rounded-lg">
                            <span className="text-amber-500/80 mr-1.5">{idx + 1}.</span>
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scaleLevel >= 2 && scaleLevel < 5 && (
                    <div className="flex items-center justify-between text-xs font-mono text-stone-400 mt-3 pt-2.5 border-t border-white/10">
                      <span className="truncate max-w-[140px] font-semibold text-amber-400/80">{album.genre}</span>
                      <span className="text-stone-400">{album.tracks.length} tracks</span>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
};
