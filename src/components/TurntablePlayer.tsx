import React, { useState, useEffect, useMemo } from 'react';
import { 
  Album, 
  TurntableState, 
  Track, 
  SlipmatType, 
  TurntableLayoutPreset, 
  ThemeMode, 
  SplitExperimentConfig,
  MaximizedScaleConfig,
  ClassicScaleConfig
} from '../types';
import { audioEngine } from '../services/audioEngine';
import { extractAlbumPalette, ExtractedPalette, generateHarmoniousPalette } from '../utils/colorExtractor';
import { ArtworkImage } from './ArtworkImage';
import { PlaybackScaleControls } from './PlaybackScaleControls';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Disc3, 
  ListMusic,
  Sliders,
  Radio, 
  LayoutGrid, 
  Sparkles,
  Info,
  Waves,
  AudioWaveform,
  X,
  Disc,
  Columns3,
  Columns2,
  Maximize2,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Move,
  Type,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TurntablePlayerProps {
  album: Album | null;
  state: TurntableState;
  onPlayPause: () => void;
  onSelectTrack: (trackIndex: number) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (ms: number) => void;
  onSetRpm: (rpm: 33 | 45) => void;
  onSetPitch: (pitch: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleCrackle: () => void;
  onSetCrackleVolume: (vol: number) => void;
  onSetDustDensity: (density: number) => void;
  onSetRumbleVolume: (vol: number) => void;
  onToggleWarmth: () => void;
  onSetSlipmat: (mat: SlipmatType) => void;
  onBackToShelf: () => void;
  onOpenInspect: () => void;
  allAlbums?: Album[];
  onSelectAlbum?: (album: Album) => void;
  isSpotifyActive?: boolean;
  discMode: 'label' | 'picture';
  onSetDiscMode: (mode: 'label' | 'picture') => void;
  dustDensity: number;
  rumbleVolume: number;
  theme?: ThemeMode;
}

const defaultSplitConfig: SplitExperimentConfig = {
  vinylSize: 420,
  sleeveSize: 420,
  titleFontSize: 32,
  trackTitleFontSize: 22,
  sleeveOffsetX: 0,
  sleeveOffsetY: 0,
  sleeveRotation: -2,
  vinylOffsetX: -40,
  vinylOffsetY: 0,
  layerOrder: 'vinyl-behind',
};

const defaultMaximizedConfig: MaximizedScaleConfig = {
  turntableScale: 100,
  sleeveScale: 100,
};

const defaultClassicConfig: ClassicScaleConfig = {
  turntableScale: 100,
  sleeveScale: 100,
};

export const TurntablePlayer: React.FC<TurntablePlayerProps> = ({
  album,
  state,
  onPlayPause,
  onSelectTrack,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onSetRpm,
  onSetPitch,
  onSetVolume,
  onToggleCrackle,
  onSetCrackleVolume,
  onSetDustDensity,
  onSetRumbleVolume,
  onToggleWarmth,
  onSetSlipmat,
  onBackToShelf,
  onOpenInspect,
  allAlbums = [],
  onSelectAlbum,
  discMode,
  onSetDiscMode,
  dustDensity,
  rumbleVolume,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  // Preset layout state: 'maximized' (Option 1) vs 'classic' (Option 2) vs 'split' (Option 3)
  const [layoutPreset, setLayoutPreset] = useState<TurntableLayoutPreset>(() => {
    const saved = localStorage.getItem('cosyvinyl_turntable_preset');
    return (saved === 'classic' || saved === 'maximized' || saved === 'split') 
      ? (saved as TurntableLayoutPreset) 
      : 'maximized';
  });

  // Option 1: Maximized View Scale Config (persisted)
  const [maximizedConfig, setMaximizedConfig] = useState<MaximizedScaleConfig>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_maximized_config');
      if (saved) {
        return { ...defaultMaximizedConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultMaximizedConfig;
  });

  const handleUpdateMaximizedConfig = (updates: Partial<MaximizedScaleConfig>) => {
    setMaximizedConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('cosyvinyl_maximized_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetMaximizedConfig = () => {
    setMaximizedConfig(defaultMaximizedConfig);
    try {
      localStorage.setItem('cosyvinyl_maximized_config', JSON.stringify(defaultMaximizedConfig));
    } catch {}
  };

  // Option 2: Classic 3-Column View Scale Config (persisted)
  const [classicConfig, setClassicConfig] = useState<ClassicScaleConfig>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_classic_config');
      if (saved) {
        return { ...defaultClassicConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultClassicConfig;
  });

  const handleUpdateClassicConfig = (updates: Partial<ClassicScaleConfig>) => {
    setClassicConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('cosyvinyl_classic_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetClassicConfig = () => {
    setClassicConfig(defaultClassicConfig);
    try {
      localStorage.setItem('cosyvinyl_classic_config', JSON.stringify(defaultClassicConfig));
    } catch {}
  };

  // Option 3: Split View Experimentation Sliders State (persisted to localStorage)
  const [splitConfig, setSplitConfig] = useState<SplitExperimentConfig>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_split_config');
      if (saved) {
        return { ...defaultSplitConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultSplitConfig;
  });

  const [showExperimentDrawer, setShowExperimentDrawer] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Update split config and persist
  const handleUpdateSplitConfig = (updates: Partial<SplitExperimentConfig>) => {
    setSplitConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('cosyvinyl_split_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Copy coordinates JSON to clipboard
  const handleCopyCoordinates = () => {
    const jsonString = JSON.stringify(splitConfig, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  // Reset to default coordinates
  const handleResetSplitConfig = () => {
    setSplitConfig(defaultSplitConfig);
    try {
      localStorage.setItem('cosyvinyl_split_config', JSON.stringify(defaultSplitConfig));
    } catch {}
  };

  // Track listing overlay visibility for maximized mode
  const [showTracklistOverlay, setShowTracklistOverlay] = useState<boolean>(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showQuickPick, setShowQuickPick] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.85);
  const [isTestingSound, setIsTestingSound] = useState(false);

  const [palette, setPalette] = useState<ExtractedPalette>(() => 
    generateHarmoniousPalette(album?.title || 'CosyVinyl', album?.accentColor)
  );

  // Save layout preset to local storage
  const handleSetPreset = (preset: TurntableLayoutPreset) => {
    setLayoutPreset(preset);
    localStorage.setItem('cosyvinyl_turntable_preset', preset);
  };

  // Current track and duration math
  const currentTrack: Track | undefined = album?.tracks[state.currentTrackIndex] || album?.tracks[0];
  const trackDuration = state.durationMs || currentTrack?.durationMs || 180000;
  const trackProgressRatio = trackDuration > 0 ? Math.min(1, Math.max(0, state.progressMs / trackDuration)) : 0;

  // Real-time album-wide duration & needle tracking math across all tracks
  const { totalAlbumDuration, albumProgressRatio } = useMemo(() => {
    if (!album || !album.tracks || album.tracks.length === 0) {
      return { totalAlbumDuration: 180000, albumProgressRatio: 0 };
    }
    const total = album.tracks.reduce((sum, t) => sum + (t.durationMs || 180000), 0);
    const prior = album.tracks
      .slice(0, state.currentTrackIndex)
      .reduce((sum, t) => sum + (t.durationMs || 180000), 0);
    const elapsed = prior + (state.progressMs || 0);
    const ratio = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
    return { totalAlbumDuration: total, albumProgressRatio: ratio };
  }, [album, state.currentTrackIndex, state.progressMs]);

  // Extract dynamic color gradient from album sleeve
  useEffect(() => {
    if (!album) return;
    let isCancelled = false;

    extractAlbumPalette(album.coverUrl, album.title, album.accentColor).then((pal) => {
      if (!isCancelled) {
        setPalette(pal);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [album?.coverUrl, album?.title, album?.accentColor]);

  // Tonearm tracking calculation: represents physical needle position across the entire album vinyl surface
  let tonearmAngle = 0;
  if (state.toneArmStatus === 'resting') {
    tonearmAngle = 0;
  } else if (state.toneArmStatus === 'cueing') {
    tonearmAngle = 18.5;
  } else if (state.toneArmStatus === 'on_record') {
    // Sweeps from outer lead-in (18.5 deg) across the whole disc radius to inner runout (37.5 deg) based on album progress
    tonearmAngle = 18.5 + albumProgressRatio * 19;
  } else if (state.toneArmStatus === 'returning') {
    tonearmAngle = 8;
  }

  // 3D deterministic tilt offset angle for the physical jacket on stand
  const albumRandomOffset = useMemo(() => {
    if (!album) return { rot: -1.5, y: 0 };
    const charCodeSum = album.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rot = -2.0 + (charCodeSum % 4) * 1.0;
    return { rot, y: (charCodeSum % 3) * -2 };
  }, [album?.title]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onSetVolume(prevVolume);
    } else {
      setPrevVolume(state.volume);
      setIsMuted(true);
      onSetVolume(0);
    }
  };

  const handleTestAudioSound = () => {
    setIsTestingSound(true);
    audioEngine.testVinylSound();
    setTimeout(() => {
      setIsTestingSound(false);
    }, 3600);
  };

  // Get album theme colors
  const waxColor = album?.waxColor || (
    album?.vinylVariant === 'emerald' ? '#40916c' :
    album?.vinylVariant === 'sage' ? '#52b788' :
    album?.vinylVariant === 'rose' ? '#be123c' :
    album?.vinylVariant === 'amber' ? '#d97706' :
    album?.vinylVariant === 'sapphire' ? '#2563eb' :
    album?.vinylVariant === 'ruby' ? '#dc2626' :
    '#18181b'
  );

  if (!album) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-8 text-amber-100">
        <Disc3 className="w-16 h-16 animate-spin text-amber-500 mb-4" />
        <h3 className="text-2xl font-serif-title font-bold">Your Turntable is Empty</h3>
        <p className="text-stone-400 max-w-sm mt-2 mb-6 text-sm">Select an album from your collection to drop the needle.</p>
        <button
          onClick={onBackToShelf}
          className="px-6 py-3 rounded-full bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 transition-all shadow-lg"
        >
          Browse Album Wall
        </button>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full min-h-[calc(100vh-3.5rem)] flex flex-col justify-between overflow-hidden px-3 sm:px-6 lg:px-10 py-3 sm:py-5 transition-all duration-1000"
      style={{
        background: palette.gradient || `radial-gradient(ellipse at 50% 35%, ${waxColor}25 0%, #16110d 65%, #080605 100%)`
      }}
    >
      {/* Background Ambient Glow mapped to Album Sleeve Palette */}
      <div 
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[1200px] 2xl:w-[2200px] h-[800px] rounded-full blur-[180px] opacity-40 transition-all duration-1000"
        style={{ backgroundColor: palette.primary || waxColor }}
      />
      <div 
        className="pointer-events-none absolute bottom-0 right-10 w-[800px] h-[600px] rounded-full blur-[160px] opacity-25 transition-all duration-1000"
        style={{ backgroundColor: palette.secondary || '#1c1917' }}
      />

      {/* ========================================================================= */}
      {/* QUICK HEADER BAR */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full max-w-[2800px] mx-auto flex items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2.5 py-1 bg-stone-950/80 border border-white/15 rounded-full shadow">
            {album.isPlaylist ? 'Curated Playlist' : '12" Audiophile Vinyl'}
          </span>
          <span className="text-xs font-mono text-stone-400 hidden sm:inline">
            {album.catalogNumber} • {album.speed || 33} RPM
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
          <span className="capitalize">{layoutPreset === 'maximized' ? 'Option 1: Maximized View' : layoutPreset === 'classic' ? 'Option 2: 3-Column Studio' : 'Option 3: Split View'}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEWPORT MODE 1: MAXIMIZED STUDIO LAYOUT (RECORD SLEEVE & TURNTABLE PREDOMINANT) */}
      {/* ========================================================================= */}
      {layoutPreset === 'maximized' && (
        <div className="relative z-10 w-full max-w-[2600px] mx-auto flex-1 flex flex-col justify-center py-2 sm:py-4">
          
          {/* Giant Side-by-Side Immersive Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 xl:gap-16 2xl:gap-24 items-center justify-items-center my-auto">
            
            {/* ================= RECORD SLEEVE (MAXIMIZED) ================= */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full flex items-center justify-center relative perspective-1000"
            >
              <div 
                className="relative group w-full max-w-[340px] sm:max-w-[440px] md:max-w-[500px] lg:max-w-[540px] xl:max-w-[620px] 2xl:max-w-[700px] aspect-square transition-all duration-300"
                style={{
                  transform: `rotate(${albumRandomOffset.rot}deg) translateY(${albumRandomOffset.y}px) scale(${maximizedConfig.sleeveScale / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* 3D Ambient Backlight Shadow */}
                <div 
                  className="absolute inset-2 rounded-3xl blur-3xl opacity-80 transition-all duration-700 group-hover:opacity-100 pointer-events-none"
                  style={{ backgroundColor: palette.glow || waxColor }}
                />

                {/* 3D Physical Heavyweight 12-inch Cardboard Jacket */}
                <div 
                  onClick={onOpenInspect}
                  className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer transform-gpu transition-all duration-500 group-hover:scale-[1.02] group-hover:rotate-0"
                  style={{
                    boxShadow: '0 35px 80px -10px rgba(0, 0, 0, 0.98), 0 20px 40px -5px rgba(0, 0, 0, 0.9), inset 0 0 0 1px rgba(255,255,255,0.2)'
                  }}
                >
                  {/* Physical 3D Spine Cardboard Thickness Edge */}
                  <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/80 via-stone-900 to-transparent z-20 pointer-events-none border-r border-black/40" />
                  
                  {/* Embossed Cardboard Edge Highlights */}
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-t border-l border-white/30 z-20 pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-b-2 border-r-2 border-black/90 z-20 pointer-events-none" />

                  {/* Resilient Album Cover with Multi-Tier Fallback */}
                  <ArtworkImage
                    src={album.coverUrl}
                    alt={album.title}
                    title={album.title}
                    artist={album.artist}
                    catalogNumber={album.catalogNumber}
                    waxColor={waxColor}
                    fallbackColor={album.spineColor || '#1c1917'}
                  />

                  {/* Cardboard Sheen & Authentic Ring-Wear Glare */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/20 pointer-events-none" />

                  {/* Interactive Gatefold Inspection Banner on Hover */}
                  <div className="absolute bottom-4 left-4 right-4 bg-stone-950/85 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-30">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-white truncate">{album.title}</p>
                      <p className="text-[10px] text-stone-300 truncate">{album.artist}</p>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-amber-500 text-stone-950 font-bold rounded-xl shrink-0 shadow">
                      Inspect Gatefold
                    </span>
                  </div>
                </div>

                {/* Cardboard Stand Metadata Bar */}
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/80 border border-white/10 text-[11px] font-mono text-stone-300 shadow">
                    <span className="text-amber-400 font-bold">{album.title}</span>
                    <span>•</span>
                    <span className="capitalize">{album.artist}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ================= TURNTABLE (MAXIMIZED) ================= */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full flex items-center justify-center relative"
            >
              <div 
                className="relative w-full max-w-[340px] sm:max-w-[440px] md:max-w-[500px] lg:max-w-[540px] xl:max-w-[620px] 2xl:max-w-[700px] aspect-square flex items-center justify-center transition-all duration-300"
                style={{
                  transform: `scale(${maximizedConfig.turntableScale / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                
                {/* Turntable Platter Deck / Heavy Aluminum Ring */}
                <div className="absolute inset-1 sm:inset-3 rounded-full bg-[#110e0c] border-[6px] sm:border-[8px] border-stone-800 shadow-[0_40px_90px_rgba(0,0,0,0.98)] flex items-center justify-center">
                  <div className="absolute inset-2 sm:inset-3 rounded-full border-2 border-dashed border-stone-700/60 opacity-70" />
                </div>

                {/* The 12" Physical Vinyl Disc */}
                <div 
                  id="vinyl-record-disc-max"
                  className={`relative w-[90%] h-[90%] rounded-full shadow-2xl flex items-center justify-center select-none ${
                    state.isPlaying ? (state.rpm === 45 ? 'spin-record-45' : 'spin-record-33') : ''
                  }`}
                  style={{
                    backgroundColor: discMode === 'picture' ? '#111' : waxColor,
                    boxShadow: `0 0 65px ${waxColor}65, 0 30px 75px rgba(0,0,0,0.98)`,
                    transition: 'background-color 0.8s ease',
                  }}
                >
                  {/* Picture Disc Artwork Overlay */}
                  {discMode === 'picture' && (
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <ArtworkImage
                        src={album.coverUrl}
                        alt={album.title}
                        title={album.title}
                        artist={album.artist}
                        catalogNumber={album.catalogNumber}
                        waxColor={waxColor}
                        fallbackColor={album.spineColor || '#1c1917'}
                        className="w-full h-full object-cover scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                    </div>
                  )}

                  {/* Micro-Grooves Overlay */}
                  <div className="absolute inset-0 rounded-full vinyl-grooves-overlay opacity-85 pointer-events-none" />

                  {/* Specular Light Reflection */}
                  <div className="absolute inset-0 rounded-full vinyl-specular-sheen opacity-95 pointer-events-none" />

                  {/* Outer Rim */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/25 pointer-events-none" />
                  <div className="absolute inset-3 rounded-full border border-black/45 pointer-events-none" />

                  {/* Inner Run-Out Matrix Groove */}
                  <div className="absolute inset-[33%] rounded-full border border-black/75 pointer-events-none">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] sm:text-[9px] text-white/40 font-mono tracking-widest uppercase">
                      {album.catalogNumber} - A1 MASTER
                    </span>
                  </div>

                  {/* Physical Center Record Label */}
                  <div 
                    className="relative z-10 w-[38%] h-[38%] rounded-full shadow-inner flex flex-col items-center justify-between p-3 sm:p-5 text-center overflow-hidden border border-black/50"
                    style={{
                      backgroundColor: discMode === 'picture' ? '#0f0f0f' : (album.labelColor || '#1e293b'),
                      color: '#ffffff',
                      boxShadow: 'inset 0 0 25px rgba(0,0,0,0.85), 0 4px 15px rgba(0,0,0,0.7)'
                    }}
                  >
                    <div className="w-full flex items-center justify-between text-[7px] sm:text-[10px] font-mono tracking-widest text-white/80 uppercase">
                      <span>SIDE A</span>
                      <span>{state.rpm} RPM</span>
                    </div>

                    <div className="my-auto px-1">
                      <p className="text-xs sm:text-sm xl:text-base font-serif-title font-bold text-white leading-tight tracking-tight drop-shadow-md truncate">
                        {currentTrack?.title || album.title}
                      </p>
                      <p className="text-[9px] sm:text-[11px] font-medium text-white/85 mt-0.5 tracking-wide truncate">
                        {album.artist}
                      </p>
                    </div>

                    <div className="w-full text-[6px] sm:text-[8px] font-mono text-white/60 tracking-tight uppercase">
                      CosyVinyl Hi-Fi
                    </div>

                    {/* Brass Center Spindle Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 sm:w-6 h-4 sm:h-6 rounded-full bg-[#d4af37] border-2 border-[#854d0e] shadow-md flex items-center justify-center">
                      <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[#1c1917] shadow-inner" />
                    </div>
                  </div>
                </div>

                {/* Audiophile Tonearm Assembly */}
                <div 
                  className="absolute top-2 right-2 sm:top-5 sm:right-5 w-32 sm:w-48 lg:w-56 xl:w-64 h-48 sm:h-72 lg:h-80 pointer-events-none transition-transform duration-700 ease-out origin-top-right z-20"
                  style={{
                    transform: `rotate(${tonearmAngle}deg)`,
                  }}
                >
                  {/* Tonearm Pivot Base / Gimbal */}
                  <div className="absolute top-0 right-0 w-12 sm:w-18 h-12 sm:h-18 rounded-full bg-stone-900 border-2 border-stone-600 shadow-2xl flex items-center justify-center">
                    <div className="w-7 sm:w-11 h-7 sm:h-11 rounded-full bg-stone-700 border border-stone-500 shadow-inner flex items-center justify-center">
                      <div className="w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-amber-500 shadow-md" />
                    </div>
                    {/* Counterweight */}
                    <div className="absolute -top-2 -right-1 w-5 sm:w-8 h-4 sm:h-7 rounded bg-stone-800 border border-stone-600 shadow-md" />
                  </div>

                  {/* Polished Silver Tonearm Tube */}
                  <div 
                    className="absolute top-7 right-5 sm:top-10 sm:right-8 w-2 sm:w-3 h-36 sm:h-60 lg:h-70 bg-gradient-to-r from-stone-400 via-stone-100 to-stone-400 rounded-full shadow-lg origin-top"
                    style={{ transform: 'rotate(-20deg)' }}
                  >
                    {/* Angled Headshell & Cartridge */}
                    <div 
                      className="absolute bottom-0 -left-2 sm:-left-3.5 w-6 sm:w-8 h-8 sm:h-11 bg-stone-950 border border-stone-700 rounded-sm shadow-2xl flex flex-col items-center justify-end pb-1"
                      style={{ transform: 'rotate(24deg)' }}
                    >
                      <div className="w-3.5 sm:w-4.5 h-3 sm:h-4 bg-amber-500 rounded-xs mb-0.5" />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Tonearm Rest Stand */}
                <div className="absolute top-12 right-1 sm:top-20 sm:right-2 w-3 sm:w-4 h-6 sm:h-8 bg-stone-800 border border-stone-600 rounded-sm" />

              </div>
            </motion.div>

          </div>

          {/* ================= SEMI-TRANSPARENT FLOATING TRACKLIST OVERLAY ================= */}
          <AnimatePresence>
            {showTracklistOverlay && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="absolute top-12 right-4 sm:right-8 z-40 w-full max-w-md bg-stone-950/85 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.95)]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-amber-400" />
                    <h4 className="font-serif-title font-bold text-white text-base">Album Tracklisting</h4>
                  </div>
                  <button
                    onClick={() => setShowTracklistOverlay(false)}
                    className="p-1 rounded-full text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 overflow-y-auto max-h-[320px] space-y-1.5 pr-1 custom-scrollbar">
                  {album.tracks.map((t, idx) => {
                    const isCurrent = state.currentTrackIndex === idx;
                    return (
                      <button
                        key={t.id || idx}
                        id={`max-track-${idx}`}
                        onClick={() => {
                          onSelectTrack(idx);
                        }}
                        className={`w-full group flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                          isCurrent
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 scale-[1.01]'
                            : 'hover:bg-white/10 text-stone-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className={`text-xs font-mono w-5 shrink-0 ${isCurrent ? 'text-stone-950 font-bold' : 'text-stone-500'}`}>
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs sm:text-sm font-medium truncate leading-tight">
                              {t.title}
                            </p>
                            <p className={`text-[10px] truncate ${isCurrent ? 'text-stone-900/80' : 'text-stone-500'}`}>
                              {t.artist || album.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                          {isCurrent && state.isPlaying ? (
                            <Disc3 className="w-3.5 h-3.5 animate-spin text-stone-950" />
                          ) : (
                            <span className={`opacity-70 ${isCurrent ? 'text-stone-950 font-bold' : 'text-stone-400'}`}>
                              {formatTime(t.durationMs || 180000)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= FLOATING GLASS TRANSPORT DOCK (MAXIMIZED) ================= */}
          <div className="relative z-30 mt-4 bg-stone-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl max-w-5xl mx-auto w-full">
            
            {/* Scrubber */}
            <div className="flex items-center gap-3 w-full mb-3">
              <span className="text-[11px] font-mono text-stone-400 w-10 text-right">
                {formatTime(state.progressMs)}
              </span>
              
              <div 
                className="relative flex-1 h-2 bg-stone-800/90 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * trackDuration);
                }}
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-full transition-all duration-100"
                  style={{ width: `${trackProgressRatio * 100}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${trackProgressRatio * 100}%`, transform: 'translateX(-50%)' }}
                />
              </div>

              <span className="text-[11px] font-mono text-stone-400 w-10">
                {formatTime(trackDuration)}
              </span>
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Left: Active Track Info */}
              <div className="flex items-center gap-3 min-w-0 max-w-xs text-left">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-stone-900">
                  <ArtworkImage
                    src={album.coverUrl}
                    alt={album.title}
                    title={album.title}
                    artist={album.artist}
                    waxColor={waxColor}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-white truncate font-serif-title">
                    {currentTrack?.title || album.title}
                  </p>
                  <p className="text-[11px] text-stone-400 truncate">
                    {album.artist} • Track {state.currentTrackIndex + 1}
                  </p>
                </div>
              </div>

              {/* Center: Big Transport & View Preset/Scale Controls */}
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="flex items-center gap-3">
                  <button
                    id="btn-max-prev"
                    onClick={onPrevTrack}
                    className="p-2 sm:p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Previous Track"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    id="btn-max-master-play"
                    onClick={onPlayPause}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-600/30 transition-all transform hover:scale-105 active:scale-95"
                    title={state.isPlaying ? 'Lift Tonearm & Pause' : 'Drop Needle & Play'}
                  >
                    {state.isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    id="btn-max-next"
                    onClick={onNextTrack}
                    className="p-2 sm:p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Next Track"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Integrated UI Preset Selector and Scale Controls */}
                <PlaybackScaleControls
                  layoutPreset={layoutPreset}
                  onSetPreset={handleSetPreset}
                  maximizedConfig={maximizedConfig}
                  onUpdateMaximizedConfig={handleUpdateMaximizedConfig}
                  onResetMaximizedConfig={handleResetMaximizedConfig}
                  classicConfig={classicConfig}
                  onUpdateClassicConfig={handleUpdateClassicConfig}
                  onResetClassicConfig={handleResetClassicConfig}
                  splitConfig={splitConfig}
                  onUpdateSplitConfig={handleUpdateSplitConfig}
                  onResetSplitConfig={handleResetSplitConfig}
                  showExperimentDrawer={showExperimentDrawer}
                  onToggleExperimentDrawer={() => setShowExperimentDrawer(!showExperimentDrawer)}
                />
              </div>

              {/* Right: Quick Tools & Overlays */}
              <div className="flex items-center gap-2 text-xs font-mono">
                
                {/* Tracklist Overlay Toggle Button */}
                <button
                  id="btn-toggle-tracklist-overlay"
                  onClick={() => setShowTracklistOverlay(!showTracklistOverlay)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                    showTracklistOverlay
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow'
                      : 'bg-stone-900/90 text-stone-300 border-white/15 hover:text-white hover:bg-stone-800'
                  }`}
                  title="Toggle Semi-Transparent Track Listing Overlay"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Tracks ({album.tracks.length})</span>
                </button>

                {/* Change Album */}
                <button
                  id="btn-max-change"
                  onClick={() => setShowQuickPick(!showQuickPick)}
                  className="px-3 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/15 transition-all flex items-center gap-1"
                  title="Change Album / Playlist"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Crate</span>
                </button>

                {/* Picture Disc Toggle */}
                <button
                  id="btn-max-picture-disc"
                  onClick={() => onSetDiscMode(discMode === 'label' ? 'picture' : 'label')}
                  className={`px-2.5 py-1.5 rounded-full border transition-all ${
                    discMode === 'picture'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-stone-900/90 text-stone-300 border-white/15 hover:text-white'
                  }`}
                  title="Toggle Picture Disc Mode"
                >
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                </button>

                {/* Platter Speed */}
                <button
                  id="btn-max-rpm"
                  onClick={() => onSetRpm(state.rpm === 33 ? 45 : 33)}
                  className="px-2.5 py-1.5 rounded-full border border-white/15 bg-stone-900/90 text-stone-200 hover:text-white font-bold"
                >
                  {state.rpm}
                </button>

                {/* Audio Dial In */}
                <button
                  id="btn-max-audio-settings"
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                  className="p-1.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white border border-white/15"
                  title="Analogue Studio Dial-In"
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEWPORT MODE 2: PRESERVED 3-COLUMN CLASSIC STUDIO LAYOUT */}
      {/* ========================================================================= */}
      {layoutPreset === 'classic' && (
        <div className="relative z-10 w-full max-w-[2800px] mx-auto my-auto py-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 2xl:gap-10 items-stretch">
            
            {/* COLUMN 1: Album Title, Tracklisting, Playback controls and menus */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col h-full"
            >
              <div className="bg-stone-950/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between h-full min-h-[580px] xl:min-h-[640px]">
                
                {/* TOP: Album Title, Artist & Metadata */}
                <div className="pb-4 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full">
                      {album.isPlaylist ? 'Curated Playlist' : '12" Vinyl LP'}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                      <span>{album.catalogNumber}</span>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: waxColor }} />
                      <span className="text-stone-300 font-semibold">{album.speed || 33} RPM</span>
                    </div>
                  </div>

                  <h2 className="font-serif-title font-bold text-xl sm:text-2xl xl:text-3xl text-white tracking-wide leading-tight line-clamp-2">
                    {album.title}
                  </h2>
                  <p className="text-sm sm:text-base text-stone-300 font-medium mt-1 truncate">
                    {album.artist} • <span className="text-amber-400 font-mono text-xs">{album.releaseYear}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-stone-400">
                    <span className="bg-white/5 px-2 py-0.5 rounded-md">{album.genre}</span>
                    <span>•</span>
                    <span>{album.tracks.length} tracks ({formatTime(totalAlbumDuration)})</span>
                  </div>
                </div>

                {/* MIDDLE: Tracklisting */}
                <div className="flex-1 my-3 flex flex-col min-h-0">
                  <div className="flex items-center justify-between pb-2 mb-1.5 text-xs font-mono text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-stone-200 uppercase tracking-wider text-[11px]">Tracklisting</span>
                    </div>
                    <span className="text-[10px]">
                      Track {state.currentTrackIndex + 1} of {album.tracks.length}
                    </span>
                  </div>

                  <div className="overflow-y-auto max-h-[220px] sm:max-h-[260px] xl:max-h-[300px] 2xl:max-h-[360px] space-y-1 pr-1 custom-scrollbar">
                    {album.tracks.map((t, idx) => {
                      const isCurrent = state.currentTrackIndex === idx;
                      return (
                        <button
                          key={t.id || idx}
                          id={`turntable-track-${idx}`}
                          onClick={() => onSelectTrack(idx)}
                          className={`w-full group flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                            isCurrent
                              ? 'bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20 scale-[1.01]'
                              : 'hover:bg-white/10 text-stone-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className={`text-xs font-mono w-5 shrink-0 ${isCurrent ? 'text-stone-950 font-bold' : 'text-stone-500 group-hover:text-stone-300'}`}>
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <p className="text-xs sm:text-sm font-medium truncate leading-tight">
                                {t.title}
                              </p>
                              <p className={`text-[10px] truncate ${isCurrent ? 'text-stone-900/80 font-medium' : 'text-stone-500'}`}>
                                {t.artist || album.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                            {isCurrent && state.isPlaying ? (
                              <Disc3 className="w-3.5 h-3.5 animate-spin text-stone-950" />
                            ) : (
                              <span className={`opacity-70 ${isCurrent ? 'text-stone-950 font-bold' : 'text-stone-400'}`}>
                                {formatTime(t.durationMs || 180000)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BOTTOM: Playback Controls & Menus */}
                <div className="pt-4 border-t border-white/10 shrink-0 space-y-3">
                  
                  {/* Progress Scrubber */}
                  <div className="flex items-center gap-2.5 w-full">
                    <span className="text-[10px] font-mono text-stone-400 w-10 text-right">
                      {formatTime(state.progressMs)}
                    </span>
                    
                    <div 
                      className="relative flex-1 h-2 bg-stone-800/90 rounded-full overflow-hidden cursor-pointer group"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                        onSeek(ratio * trackDuration);
                      }}
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-full transition-all duration-100"
                        style={{ width: `${trackProgressRatio * 100}%` }}
                      />
                      <div 
                        className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `${trackProgressRatio * 100}%`, transform: 'translateX(-50%)' }}
                      />
                    </div>

                    <span className="text-[10px] font-mono text-stone-400 w-10">
                      {formatTime(trackDuration)}
                    </span>
                  </div>

                  {/* Primary Transport Buttons */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-prev-track"
                        onClick={onPrevTrack}
                        className="p-2 sm:p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        title="Previous Track"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>

                      <button
                        id="btn-master-play-pause"
                        onClick={onPlayPause}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-600/30 transition-all transform hover:scale-105 active:scale-95"
                        title={state.isPlaying ? 'Lift Tonearm & Pause' : 'Drop Needle & Play'}
                      >
                        {state.isPlaying ? (
                          <Pause className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        id="btn-next-track"
                        onClick={onNextTrack}
                        className="p-2 sm:p-2.5 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        title="Next Track"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleMuteToggle}
                        className="text-stone-400 hover:text-white transition-colors p-1"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || state.volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-stone-300" />
                        )}
                      </button>

                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : state.volume}
                        onChange={(e) => {
                          setIsMuted(false);
                          onSetVolume(parseFloat(e.target.value));
                        }}
                        className="w-16 sm:w-20 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                        title="Master Volume"
                      />
                    </div>
                  </div>

                  {/* Menus, Scale Controls & Auxiliary Controls Row */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10 text-xs font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <button
                        id="btn-change-album"
                        onClick={() => setShowQuickPick(!showQuickPick)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all ${
                          showQuickPick 
                            ? 'bg-amber-500 text-stone-950 font-bold border-amber-400' 
                            : 'bg-stone-900/80 text-stone-300 border-white/10 hover:text-white hover:bg-stone-800'
                        }`}
                        title="Switch Album or Playlist"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>

                      <button
                        id="btn-toggle-picture-disc"
                        onClick={() => onSetDiscMode(discMode === 'label' ? 'picture' : 'label')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all ${
                          discMode === 'picture'
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-stone-900/80 text-stone-300 border-white/10 hover:text-white'
                        }`}
                        title="Switch between Center Label and Picture Disc"
                      >
                        <Disc className="w-3.5 h-3.5 text-amber-400" />
                        <span>{discMode === 'picture' ? 'Pic Disc' : 'Label'}</span>
                      </button>

                      <button
                        id="btn-toggle-rpm"
                        onClick={() => onSetRpm(state.rpm === 33 ? 45 : 33)}
                        className="px-2.5 py-1.5 rounded-full text-xs font-bold border border-white/15 bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white transition-all shadow"
                      >
                        {state.rpm} RPM
                      </button>

                      <button
                        id="btn-toggle-needle-crackle"
                        onClick={onToggleCrackle}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border transition-all ${
                          state.needleCrackleEnabled
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-stone-900/80 text-stone-400 border-white/10 hover:text-stone-200'
                        }`}
                        title="Toggle Needle Crackle Noise"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Crackle</span>
                      </button>

                      <button
                        id="btn-open-audio-settings"
                        onClick={() => setShowAudioSettings(!showAudioSettings)}
                        className="p-1.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-all shadow"
                        title="Analogue Studio Dial-In"
                      >
                        <Sliders className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>

                    {/* Integrated UI Preset Selector and Scale Controls for Option 2 */}
                    <div className="pt-1.5 flex items-center justify-between">
                      <PlaybackScaleControls
                        layoutPreset={layoutPreset}
                        onSetPreset={handleSetPreset}
                        maximizedConfig={maximizedConfig}
                        onUpdateMaximizedConfig={handleUpdateMaximizedConfig}
                        onResetMaximizedConfig={handleResetMaximizedConfig}
                        classicConfig={classicConfig}
                        onUpdateClassicConfig={handleUpdateClassicConfig}
                        onResetClassicConfig={handleResetClassicConfig}
                        splitConfig={splitConfig}
                        onUpdateSplitConfig={handleUpdateSplitConfig}
                        onResetSplitConfig={handleResetSplitConfig}
                        showExperimentDrawer={showExperimentDrawer}
                        onToggleExperimentDrawer={() => setShowExperimentDrawer(!showExperimentDrawer)}
                      />
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>

            {/* COLUMN 2: Record sleeve */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <div className="w-full bg-stone-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center justify-center h-full min-h-[580px] xl:min-h-[640px] relative overflow-hidden">
                
                <div 
                  className="relative group perspective-1000 w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] xl:max-w-[480px] 2xl:max-w-[540px] aspect-square transition-all duration-300"
                  style={{
                    transform: `rotate(${albumRandomOffset.rot}deg) translateY(${albumRandomOffset.y}px) scale(${classicConfig.sleeveScale / 100})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <div 
                    className="absolute inset-4 rounded-3xl blur-3xl opacity-75 transition-all duration-700 group-hover:opacity-95 pointer-events-none"
                    style={{ backgroundColor: palette.glow || waxColor }}
                  />

                  <div 
                    onClick={onOpenInspect}
                    className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer transform-gpu transition-all duration-500 group-hover:scale-[1.03] group-hover:rotate-0"
                    style={{
                      boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.98), 0 15px 30px -5px rgba(0, 0, 0, 0.9), inset 0 0 0 1px rgba(255,255,255,0.2)'
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-gradient-to-r from-black/80 via-stone-900 to-transparent z-20 pointer-events-none border-r border-black/40" />
                    
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-t border-l border-white/30 z-20 pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border-b-2 border-r-2 border-black/90 z-20 pointer-events-none" />

                    <ArtworkImage
                      src={album.coverUrl}
                      alt={album.title}
                      title={album.title}
                      artist={album.artist}
                      catalogNumber={album.catalogNumber}
                      waxColor={waxColor}
                      fallbackColor={album.spineColor || '#1c1917'}
                    />

                    <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-white/20 pointer-events-none" />

                    <div className="absolute bottom-4 left-4 right-4 bg-stone-950/85 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-30">
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-white truncate">{album.title}</p>
                        <p className="text-[10px] text-stone-300 truncate">{album.artist}</p>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-amber-500 text-stone-950 font-bold rounded-xl shrink-0 shadow">
                        Inspect Liner Notes
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/80 border border-white/10 text-[11px] font-mono text-stone-300">
                      <span className="text-amber-400 font-bold">12" Physical Sleeve</span>
                      <span>•</span>
                      <span className="capitalize">{album.vinylVariant.replace('-', ' ')} Wax</span>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>

            {/* COLUMN 3: Turntable */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center h-full relative"
            >
              <div className="w-full bg-stone-950/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center justify-center h-full min-h-[580px] xl:min-h-[640px] relative overflow-hidden">
                
                <div 
                  className="relative w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] xl:max-w-[480px] 2xl:max-w-[540px] aspect-square flex items-center justify-center transition-all duration-300"
                  style={{
                    transform: `scale(${classicConfig.turntableScale / 100})`,
                    transformOrigin: 'center center',
                  }}
                >
                  
                  <div className="absolute inset-1 sm:inset-2.5 rounded-full bg-[#110e0c] border-[6px] border-stone-800 shadow-[0_35px_80px_rgba(0,0,0,0.98)] flex items-center justify-center">
                    <div className="absolute inset-2 rounded-full border-2 border-dashed border-stone-700/60 opacity-70" />
                  </div>

                  <div 
                    id="vinyl-record-disc-classic"
                    className={`relative w-[89%] h-[89%] rounded-full shadow-2xl flex items-center justify-center select-none ${
                      state.isPlaying ? (state.rpm === 45 ? 'spin-record-45' : 'spin-record-33') : ''
                    }`}
                    style={{
                      backgroundColor: discMode === 'picture' ? '#111' : waxColor,
                      boxShadow: `0 0 55px ${waxColor}65, 0 25px 65px rgba(0,0,0,0.98)`,
                      transition: 'background-color 0.8s ease',
                    }}
                  >
                    {discMode === 'picture' && (
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <ArtworkImage
                          src={album.coverUrl}
                          alt={album.title}
                          title={album.title}
                          artist={album.artist}
                          waxColor={waxColor}
                          className="w-full h-full object-cover scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 rounded-full vinyl-grooves-overlay opacity-85 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full vinyl-specular-sheen opacity-95 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full border-2 border-white/25 pointer-events-none" />
                    <div className="absolute inset-3 rounded-full border border-black/45 pointer-events-none" />

                    <div className="absolute inset-[33%] rounded-full border border-black/75 pointer-events-none">
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] text-white/40 font-mono tracking-widest uppercase">
                        {album.catalogNumber} - A1 MASTER
                      </span>
                    </div>

                    <div 
                      className="relative z-10 w-[38%] h-[38%] rounded-full shadow-inner flex flex-col items-center justify-between p-2.5 sm:p-4 text-center overflow-hidden border border-black/50"
                      style={{
                        backgroundColor: discMode === 'picture' ? '#0f0f0f' : (album.labelColor || '#1e293b'),
                        color: '#ffffff',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.85), 0 3px 12px rgba(0,0,0,0.7)'
                      }}
                    >
                      <div className="w-full flex items-center justify-between text-[6px] sm:text-[9px] font-mono tracking-widest text-white/80 uppercase">
                        <span>SIDE A</span>
                        <span>{state.rpm} RPM</span>
                      </div>

                      <div className="my-auto px-1">
                        <p className="text-[11px] sm:text-xs xl:text-sm font-serif-title font-bold text-white leading-tight tracking-tight drop-shadow-md truncate">
                          {currentTrack?.title || album.title}
                        </p>
                        <p className="text-[8px] sm:text-[10px] font-medium text-white/85 mt-0.5 tracking-wide truncate">
                          {album.artist}
                        </p>
                      </div>

                      <div className="w-full text-[5px] sm:text-[7px] font-mono text-white/60 tracking-tight uppercase">
                        CosyVinyl Hi-Fi
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-[#d4af37] border-2 border-[#854d0e] shadow-md flex items-center justify-center">
                        <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#1c1917] shadow-inner" />
                      </div>
                    </div>
                  </div>

                  {/* Tonearm Assembly */}
                  <div 
                    className="absolute top-2 right-2 sm:top-5 sm:right-5 w-28 sm:w-44 lg:w-48 xl:w-56 h-44 sm:h-64 lg:h-72 pointer-events-none transition-transform duration-700 ease-out origin-top-right z-20"
                    style={{
                      transform: `rotate(${tonearmAngle}deg)`,
                    }}
                  >
                    <div className="absolute top-0 right-0 w-11 sm:w-16 h-11 sm:h-16 rounded-full bg-stone-900 border-2 border-stone-600 shadow-2xl flex items-center justify-center">
                      <div className="w-6 sm:w-10 h-6 sm:h-10 rounded-full bg-stone-700 border border-stone-500 shadow-inner flex items-center justify-center">
                        <div className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full bg-amber-500 shadow-md" />
                      </div>
                      <div className="absolute -top-2 -right-1 w-5 sm:w-7 h-4 sm:h-6 rounded bg-stone-800 border border-stone-600 shadow-md" />
                    </div>

                    <div 
                      className="absolute top-7 right-5 sm:top-9 sm:right-7 w-1.5 sm:w-2.5 h-32 sm:h-52 lg:h-60 bg-gradient-to-r from-stone-400 via-stone-100 to-stone-400 rounded-full shadow-lg origin-top"
                      style={{ transform: 'rotate(-20deg)' }}
                    >
                      <div 
                        className="absolute bottom-0 -left-2 sm:-left-3 w-5 sm:w-7 h-7 sm:h-10 bg-stone-950 border border-stone-700 rounded-sm shadow-2xl flex flex-col items-center justify-end pb-1"
                        style={{ transform: 'rotate(24deg)' }}
                      >
                        <div className="w-3 sm:w-4 h-2.5 sm:h-3 bg-amber-500 rounded-xs mb-0.5" />
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-12 right-1 sm:top-20 sm:right-2 w-3 sm:w-4 h-6 sm:h-8 bg-stone-800 border border-stone-600 rounded-sm" />

                </div>

                <div className="mt-4 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {state.isPlaying ? 'Platter Spinning' : 'Platter Idling'} • Stylus at Groove {state.currentTrackIndex + 1}
                  </span>
                  <p className="text-xs text-stone-300 font-medium mt-0.5 truncate max-w-xs">
                    {currentTrack?.title}
                  </p>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEWPORT MODE 3: SPLIT VIEW (OPTION 3) - MINIMALIST VINYL + SLEEVE + EXPERIMENTATION */}
      {/* ========================================================================= */}
      {layoutPreset === 'split' && (
        <div className="relative z-10 w-full max-w-[2800px] mx-auto flex-1 flex flex-col justify-between py-2 sm:py-4">
          
          {/* Top Interactive Experimentation Banner / Sliders Drawer */}
          <div className="mb-4">
            <div className={`rounded-2xl border transition-all duration-300 ${
              isLight 
                ? 'bg-white/90 border-stone-300 shadow-lg text-stone-800' 
                : 'bg-stone-950/85 backdrop-blur-xl border-white/15 shadow-2xl text-stone-200'
            }`}>
              {/* Header Toggle Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                  <span className="font-bold tracking-wider uppercase text-amber-500">
                    OPTION 3 INTERACTIVE EXPERIMENTATION LAB
                  </span>
                  <span className="text-stone-400 hidden sm:inline">• Live Scale &amp; Overlap Placement</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-copy-coordinates"
                    onClick={handleCopyCoordinates}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all shadow active:scale-95 text-xs"
                    title="Copy live JSON coordinates to clipboard to paste into AI Studio"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied Coordinates!' : 'Copy Coordinates'}</span>
                  </button>

                  <button
                    id="btn-reset-split-config"
                    onClick={handleResetSplitConfig}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 transition-colors text-xs"
                    title="Reset to default coordinates"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>

                  <button
                    onClick={() => setShowExperimentDrawer(!showExperimentDrawer)}
                    className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors ml-1"
                    title={showExperimentDrawer ? 'Collapse Sliders' : 'Expand Sliders'}
                  >
                    {showExperimentDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Sliders & Readout Area */}
              <AnimatePresence>
                {showExperimentDrawer && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden p-4 text-xs font-mono"
                  >
                    {/* 3-Column Grid for Scale, Placement, and Live JSON Readout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      
                      {/* Section A: Scale Controls */}
                      <div className="space-y-3 bg-black/20 p-3.5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider pb-1 border-b border-white/10">
                          <Layers className="w-3.5 h-3.5" />
                          <span>1. Scale &amp; Typography</span>
                        </div>

                        {/* Vinyl Record Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Vinyl Record Size:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.vinylSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={240}
                            max={680}
                            step={5}
                            value={splitConfig.vinylSize}
                            onChange={(e) => handleUpdateSplitConfig({ vinylSize: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Sleeve Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Album Sleeve Size:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.sleeveSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={240}
                            max={680}
                            step={5}
                            value={splitConfig.sleeveSize}
                            onChange={(e) => handleUpdateSplitConfig({ sleeveSize: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Title Font Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Record Title Font:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.titleFontSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={18}
                            max={54}
                            step={1}
                            value={splitConfig.titleFontSize}
                            onChange={(e) => handleUpdateSplitConfig({ titleFontSize: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Track Title Font Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Track Title Font:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.trackTitleFontSize}px</span>
                          </div>
                          <input
                            type="range"
                            min={14}
                            max={44}
                            step={1}
                            value={splitConfig.trackTitleFontSize}
                            onChange={(e) => handleUpdateSplitConfig({ trackTitleFontSize: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Section B: Offset & Overlap Coordinates */}
                      <div className="space-y-3 bg-black/20 p-3.5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider pb-1 border-b border-white/10">
                          <Move className="w-3.5 h-3.5" />
                          <span>2. Offset &amp; Overlap Coordinates</span>
                        </div>

                        {/* Vinyl Horizontal Offset */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Vinyl Offset X (Overlap):</span>
                            <span className="text-amber-400 font-bold">{splitConfig.vinylOffsetX}px</span>
                          </div>
                          <input
                            type="range"
                            min={-350}
                            max={350}
                            step={5}
                            value={splitConfig.vinylOffsetX}
                            onChange={(e) => handleUpdateSplitConfig({ vinylOffsetX: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Vinyl Vertical Offset */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Vinyl Offset Y:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.vinylOffsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={5}
                            value={splitConfig.vinylOffsetY}
                            onChange={(e) => handleUpdateSplitConfig({ vinylOffsetY: parseInt(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Sleeve Rotation */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-stone-300">Sleeve Tilt Angle:</span>
                            <span className="text-amber-400 font-bold">{splitConfig.sleeveRotation}°</span>
                          </div>
                          <input
                            type="range"
                            min={-20}
                            max={20}
                            step={0.5}
                            value={splitConfig.sleeveRotation}
                            onChange={(e) => handleUpdateSplitConfig({ sleeveRotation: parseFloat(e.target.value) })}
                            className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Layer Order Toggle */}
                        <div>
                          <span className="text-stone-300 block mb-1.5">Layer Depth / Z-Index:</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: 'vinyl-behind', label: 'Behind Sleeve' },
                              { id: 'vinyl-front', label: 'In Front' },
                              { id: 'side-by-side', label: 'Equal Side' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => handleUpdateSplitConfig({ layerOrder: opt.id as any })}
                                className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                                  splitConfig.layerOrder === opt.id
                                    ? 'bg-amber-500 text-stone-950 shadow'
                                    : 'bg-white/5 text-stone-400 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section C: Live Numeric Readout & Quick Coordinate Presets */}
                      <div className="space-y-3 bg-black/20 p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-amber-500 font-bold uppercase tracking-wider pb-1 border-b border-white/10 mb-2">
                            <span>3. Live JSON Coordinates</span>
                            <span className="text-[10px] text-stone-400 font-normal">Auto-Updated</span>
                          </div>

                          <pre className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-[10px] text-amber-300 font-mono overflow-x-auto max-h-[110px] leading-relaxed">
{JSON.stringify(splitConfig, null, 2)}
                          </pre>
                        </div>

                        {/* Quick Presets */}
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[10px] text-stone-400 block mb-1.5 uppercase font-bold">Quick Presets:</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => handleUpdateSplitConfig({
                                vinylSize: 420,
                                sleeveSize: 420,
                                titleFontSize: 30,
                                trackTitleFontSize: 22,
                                sleeveOffsetX: 0,
                                sleeveOffsetY: 0,
                                sleeveRotation: 0,
                                vinylOffsetX: 0,
                                vinylOffsetY: 0,
                                layerOrder: 'side-by-side',
                              })}
                              className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[10px] text-stone-300 hover:text-white transition-colors"
                            >
                              Clean 50/50
                            </button>
                            <button
                              onClick={() => handleUpdateSplitConfig({
                                vinylSize: 440,
                                sleeveSize: 420,
                                titleFontSize: 32,
                                trackTitleFontSize: 24,
                                sleeveOffsetX: 0,
                                sleeveOffsetY: 0,
                                sleeveRotation: -3,
                                vinylOffsetX: -140,
                                vinylOffsetY: 0,
                                layerOrder: 'vinyl-behind',
                              })}
                              className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[10px] text-stone-300 hover:text-white transition-colors"
                            >
                              Pulled From Sleeve
                            </button>
                            <button
                              onClick={() => handleUpdateSplitConfig({
                                vinylSize: 460,
                                sleeveSize: 400,
                                titleFontSize: 34,
                                trackTitleFontSize: 24,
                                sleeveOffsetX: 20,
                                sleeveOffsetY: 0,
                                sleeveRotation: -4,
                                vinylOffsetX: -180,
                                vinylOffsetY: 10,
                                layerOrder: 'vinyl-front',
                              })}
                              className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[10px] text-stone-300 hover:text-white transition-colors"
                            >
                              Front Layer Overlap
                            </button>
                            <button
                              onClick={() => handleUpdateSplitConfig({
                                vinylSize: 520,
                                sleeveSize: 520,
                                titleFontSize: 40,
                                trackTitleFontSize: 28,
                                sleeveOffsetX: 0,
                                sleeveOffsetY: 0,
                                sleeveRotation: -1.5,
                                vinylOffsetX: -80,
                                vinylOffsetY: 0,
                                layerOrder: 'vinyl-behind',
                              })}
                              className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[10px] text-stone-300 hover:text-white transition-colors"
                            >
                              Monumental Hi-Fi
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE 2-COLUMN SPLIT VIEW STAGE */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center justify-items-center flex-1 my-auto w-full max-w-[2600px] mx-auto min-h-[580px]">
            
            {/* ================= COLUMN 1 (LEFT 50%): TITLE + SLEEVE + PLAYBACK CONTROLS ================= */}
            <div className="w-full flex flex-col items-center justify-between h-full max-w-2xl px-2">
              
              {/* TOP: Record Title & Metadata with Live Scaled Font */}
              <div className="w-full text-center lg:text-left mb-4">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                    {album.genre}
                  </span>
                  <span className="text-xs font-mono text-stone-400">
                    {album.releaseYear} • {album.catalogNumber}
                  </span>
                </div>

                <h1 
                  className={`font-serif-title font-bold tracking-tight leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] truncate ${
                    isLight ? 'text-stone-900' : 'text-amber-100'
                  }`}
                  style={{ fontSize: `${splitConfig.titleFontSize}px` }}
                >
                  {album.title}
                </h1>
                <p className="text-base sm:text-lg text-stone-300 font-medium tracking-wide mt-0.5 truncate">
                  {album.artist}
                </p>
              </div>

              {/* MIDDLE: 12" Physical Album Sleeve Artwork with Live Scale & Offsets */}
              <div 
                className="relative flex items-center justify-center my-4 transition-all duration-300"
                style={{
                  zIndex: splitConfig.layerOrder === 'vinyl-front' ? 10 : 30,
                  transform: `translate(${splitConfig.sleeveOffsetX}px, ${splitConfig.sleeveOffsetY}px) rotate(${splitConfig.sleeveRotation}deg)`,
                }}
              >
                <div 
                  className="relative rounded-2xl overflow-hidden bg-stone-950 cursor-pointer shadow-2xl transition-all duration-500 hover:scale-[1.02]"
                  style={{
                    width: `${splitConfig.sleeveSize}px`,
                    height: `${splitConfig.sleeveSize}px`,
                    maxWidth: '85vw',
                    maxHeight: '85vw',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.9)'
                  }}
                  onClick={onOpenInspect}
                >
                  {/* Left Spine Thickness Gradient */}
                  <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-stone-900 via-stone-800 to-transparent z-20 pointer-events-none opacity-90 border-r border-black/60" />
                  
                  {/* Cardboard Bevels */}
                  <div className="absolute inset-0 rounded-2xl border-t border-l border-white/30 z-20 pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl border-b-2 border-r-2 border-black/90 z-20 pointer-events-none" />

                  {/* Artwork Image */}
                  <ArtworkImage
                    src={album.coverUrl}
                    alt={album.title}
                    title={album.title}
                    artist={album.artist}
                    catalogNumber={album.catalogNumber}
                    waxColor={waxColor}
                    fallbackColor={album.spineColor || '#1c1917'}
                  />

                  {/* Ring Wear Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/20 pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />

                  {/* Click to Inspect Overlay Chip */}
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-stone-950/85 backdrop-blur-md border border-white/20 text-[11px] font-mono text-stone-200 flex items-center gap-1.5 shadow-lg z-20 opacity-0 hover:opacity-100 transition-opacity">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>Liner Notes</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM: Complete Playback Controls Bar with Seek Scrubber and Volume */}
              <div className="w-full bg-stone-950/85 backdrop-blur-2xl border border-white/15 p-4 sm:p-5 rounded-3xl shadow-2xl mt-4">
                
                {/* Scrubber Timeline */}
                <div className="w-full mb-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mb-1.5">
                    <span className="text-amber-400 font-bold">{formatTime(state.progressMs)}</span>
                    <span className="text-stone-300">{currentTrack?.title}</span>
                    <span>{formatTime(trackDuration)}</span>
                  </div>
                  
                  <div 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                      onSeek(ratio * trackDuration);
                    }}
                    className="relative w-full h-2 rounded-full bg-stone-800 cursor-pointer overflow-hidden group shadow-inner"
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-full transition-all duration-100"
                      style={{ width: `${trackProgressRatio * 100}%` }}
                    />
                    <div 
                      className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 pointer-events-none"
                      style={{ left: `${trackProgressRatio * 100}%` }}
                    />
                  </div>
                </div>

                {/* Main Transport & Options */}
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Left: Speed Toggle & Crackle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-split-rpm"
                      onClick={() => onSetRpm(state.rpm === 33 ? 45 : 33)}
                      className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-xs font-mono font-bold text-amber-400 shadow transition-colors"
                      title="Switch Platter Rotation Speed"
                    >
                      {state.rpm} RPM
                    </button>

                    <button
                      id="btn-split-crackle"
                      onClick={onToggleCrackle}
                      className={`p-2 rounded-xl border text-xs transition-colors ${
                        state.needleCrackleEnabled
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                          : 'bg-stone-900 border-white/10 text-stone-500'
                      }`}
                      title={state.needleCrackleEnabled ? 'Needle Crackle: ON' : 'Needle Crackle: OFF'}
                    >
                      <Radio className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center: Skip Prev, Play/Pause, Skip Next */}
                  <div className="flex items-center gap-3">
                    <button
                      id="btn-split-prev"
                      onClick={onPrevTrack}
                      className="p-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-transform active:scale-90"
                      title="Previous Track"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      id="btn-split-play-pause"
                      onClick={onPlayPause}
                      className="p-4 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                      title={state.isPlaying ? 'Lift Tonearm / Pause' : 'Drop Needle / Spin'}
                    >
                      {state.isPlaying ? (
                        <Pause className="w-6 h-6 fill-stone-950" />
                      ) : (
                        <Play className="w-6 h-6 fill-stone-950 translate-x-0.5" />
                      )}
                    </button>

                    <button
                      id="btn-split-next"
                      onClick={onNextTrack}
                      className="p-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-transform active:scale-90"
                      title="Next Track"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right: Volume & Popovers */}
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={handleMuteToggle}
                        className="text-stone-400 hover:text-white transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || state.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        id="input-split-volume"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : state.volume}
                        onChange={(e) => {
                          if (isMuted) setIsMuted(false);
                          onSetVolume(parseFloat(e.target.value));
                        }}
                        className="w-16 lg:w-20 accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <button
                      id="btn-split-audio-settings"
                      onClick={() => setShowAudioSettings(true)}
                      className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-colors"
                      title="Audio Dial-In Settings"
                    >
                      <Sliders className="w-4 h-4 text-amber-400" />
                    </button>

                    <button
                      id="btn-split-tracklist"
                      onClick={() => setShowTracklistOverlay(true)}
                      className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 transition-colors"
                      title="View Full Tracklist"
                    >
                      <ListMusic className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>

                </div>
              </div>

            </div>


            {/* ================= COLUMN 2 (RIGHT 50%): MINIMALIST PURE VINYL VISUAL ================= */}
            <div className="w-full flex flex-col items-center justify-center h-full max-w-2xl px-2">
              
              {/* TOP: Track Title & Information with Live Scaled Font */}
              <div className="w-full text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-950/80 backdrop-blur-md border border-white/15 text-[11px] font-mono text-amber-400 font-bold mb-1 shadow">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>TRACK {String(state.currentTrackIndex + 1).padStart(2, '0')} OF {album.tracks.length}</span>
                  <span className="text-stone-500">•</span>
                  <span className="text-stone-300">{formatTime(trackDuration)}</span>
                </div>

                <h2 
                  className={`font-serif-title font-bold tracking-tight leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] truncate px-4 ${
                    isLight ? 'text-stone-900' : 'text-amber-100'
                  }`}
                  style={{ fontSize: `${splitConfig.trackTitleFontSize}px` }}
                >
                  {currentTrack?.title || album.title}
                </h2>
                <p className="text-sm sm:text-base text-stone-300 font-medium tracking-wide mt-0.5 truncate">
                  {album.artist}
                </p>
              </div>

              {/* MIDDLE / CENTER: Minimalist Pure Floating Spinning Vinyl Record (NO TURNTABLE HARDWARE) */}
              <div 
                className="relative flex items-center justify-center transition-all duration-300 my-4"
                style={{
                  zIndex: splitConfig.layerOrder === 'vinyl-front' ? 30 : 10,
                  transform: `translate(${splitConfig.vinylOffsetX}px, ${splitConfig.vinylOffsetY}px)`,
                }}
              >
                {/* Floating Spinning Vinyl Disc */}
                <div 
                  className="relative rounded-full flex items-center justify-center shadow-[0_30px_70px_rgba(0,0,0,0.95)]"
                  style={{
                    width: `${splitConfig.vinylSize}px`,
                    height: `${splitConfig.vinylSize}px`,
                    maxWidth: '88vw',
                    maxHeight: '88vw',
                    backgroundColor: waxColor,
                  }}
                >
                  {/* Concentric Realistic Physical Vinyl Grooves */}
                  <div className="absolute inset-0 rounded-full vinyl-grooves-overlay opacity-90 pointer-events-none" />
                  
                  {/* Specular Light Sheen Conic Flare that Rotates Smoothly */}
                  <div 
                    className="absolute inset-0 rounded-full vinyl-specular-sheen opacity-95 pointer-events-none"
                    style={{
                      animation: state.isPlaying ? `spin ${state.rpm === 33 ? 1.8 : 1.33}s linear infinite` : 'none',
                    }}
                  />

                  {/* Outer Wax Edge Rim & Bevel */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none" />
                  <div className="absolute inset-3 rounded-full border border-black/40 pointer-events-none" />

                  {/* Run-Out Lead-in Matrix Stamp Ring */}
                  <div className="absolute inset-[33%] rounded-full border border-black/75 pointer-events-none">
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] text-white/40 font-mono tracking-widest uppercase">
                      {album.catalogNumber} - OPTION 3 HI-FI
                    </span>
                  </div>

                  {/* Center Label / Picture Disc Spinning Assembly */}
                  <div 
                    className="relative z-10 w-[38%] h-[38%] rounded-full shadow-inner flex flex-col items-center justify-between p-3 text-center overflow-hidden border border-black/50"
                    style={{
                      backgroundColor: discMode === 'picture' ? '#0f0f0f' : (album.labelColor || '#1e293b'),
                      color: '#ffffff',
                      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.85), 0 4px 14px rgba(0,0,0,0.7)',
                      animation: state.isPlaying ? `spin ${state.rpm === 33 ? 1.8 : 1.33}s linear infinite` : 'none',
                    }}
                  >
                    {/* Picture disc artwork if selected */}
                    {discMode === 'picture' && (
                      <div className="absolute inset-0 opacity-80 pointer-events-none">
                        <ArtworkImage
                          src={album.coverUrl}
                          alt={album.title}
                          title={album.title}
                          artist={album.artist}
                          waxColor={waxColor}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40" />
                      </div>
                    )}

                    {/* Top Label Info */}
                    <div className="relative z-10 w-full flex items-center justify-between text-[6px] sm:text-[9px] font-mono tracking-widest text-white/90 uppercase font-bold">
                      <span>SIDE A</span>
                      <span>{state.rpm} RPM</span>
                    </div>

                    {/* Middle Track Title */}
                    <div className="relative z-10 my-auto px-1">
                      <p className="text-[11px] sm:text-xs xl:text-sm font-serif-title font-bold text-white leading-tight tracking-tight drop-shadow-md truncate">
                        {currentTrack?.title || album.title}
                      </p>
                      <p className="text-[8px] sm:text-[10px] font-medium text-white/85 mt-0.5 tracking-wide truncate">
                        {album.artist}
                      </p>
                    </div>

                    {/* Bottom Label Logo */}
                    <div className="relative z-10 w-full text-[5px] sm:text-[7px] font-mono text-white/70 tracking-tight uppercase font-semibold">
                      CosyVinyl Option 3 • Pure Wax
                    </div>

                    {/* Center Brass Spindle Bushing */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-[#d4af37] border-2 border-[#854d0e] shadow-md flex items-center justify-center z-20">
                      <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#1c1917] shadow-inner" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Status Pill below vinyl */}
              <div className="mt-3 text-center">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {state.isPlaying ? `Spinning at ${state.rpm} RPM` : 'Needle Lifted (Idling)'}
                </span>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-OUT HI-FI ANALOGUE STUDIO DIAL-IN DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAudioSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="fixed inset-x-4 bottom-12 max-w-lg mx-auto z-50 bg-stone-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-serif-title font-bold text-white text-base">Analogue Studio & Acoustic Dial-In</h4>
                  <p className="text-[11px] text-stone-400 font-mono">Fine-tune needle crackle, rumble & tube warmth</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAudioSettings(false)}
                className="p-1.5 text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-mono">
              
              {/* Audio Acoustic Test */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-amber-300 font-bold">Acoustic Audio Test</span>
                  <p className="text-[10px] text-stone-400">Play instant needle drop & vinyl crackle test</p>
                </div>
                <button
                  id="btn-test-vinyl-sound"
                  onClick={handleTestAudioSound}
                  disabled={isTestingSound}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all shadow active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <AudioWaveform className="w-3.5 h-3.5" />
                  <span>{isTestingSound ? 'Testing...' : 'Test Sound'}</span>
                </button>
              </div>

              {/* Crackle Noise */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white font-medium">Needle Surface Crackle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{Math.round(state.needleCrackleVolume * 100)}%</span>
                    <button
                      onClick={onToggleCrackle}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                        state.needleCrackleEnabled ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {state.needleCrackleEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
                <input
                  id="input-crackle-volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={state.needleCrackleVolume}
                  onChange={(e) => onSetCrackleVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Dust & Static */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white font-medium">Vinyl Dust & Static Pops</span>
                  </div>
                  <span className="text-stone-400 font-bold">
                    {dustDensity < 0.3 ? 'Mint (Low)' : dustDensity < 0.7 ? 'Authentic (Med)' : 'Thrift Store (High)'}
                  </span>
                </div>
                <input
                  id="input-dust-density"
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={dustDensity}
                  onChange={(e) => onSetDustDensity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Motor Rumble */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white font-medium">Turntable Motor Rumble</span>
                  </div>
                  <span className="text-stone-400 font-bold">{Math.round(rumbleVolume * 100)}%</span>
                </div>
                <input
                  id="input-rumble-volume"
                  type="range"
                  min={0}
                  max={1.0}
                  step={0.05}
                  value={rumbleVolume}
                  onChange={(e) => onSetRumbleVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Warmth Preamp */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-white font-medium">Analog Tube Warmth Preamp</span>
                  <p className="text-[10px] text-stone-400">+3.8dB warm low-end &amp; silky high rolloff</p>
                </div>
                <button
                  id="btn-toggle-warmth"
                  onClick={onToggleWarmth}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    state.analogWarmth ? 'bg-amber-500' : 'bg-stone-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    state.analogWarmth ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Slipmat Style */}
              <div>
                <span className="text-white font-medium block mb-2">Turntable Slipmat Style</span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(['classic-felt', 'cork', 'technics-dj', 'hypnotic-strobe', 'optical-grid'] as SlipmatType[]).map((mat) => (
                    <button
                      key={mat}
                      onClick={() => onSetSlipmat(mat)}
                      className={`p-2 rounded-xl text-[10px] font-mono capitalize transition-all ${
                        state.slipmat === mat
                          ? 'bg-amber-500 text-stone-950 font-bold shadow'
                          : 'bg-stone-900 text-stone-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {mat.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* POP-OUT QUICK ALBUM PICKER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showQuickPick && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-4 bottom-12 max-w-5xl mx-auto z-50 bg-stone-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-amber-400" />
                <h4 className="font-serif-title font-bold text-white text-lg">Pick a Record or Playlist</h4>
              </div>
              <button 
                onClick={() => setShowQuickPick(false)}
                className="text-xs text-stone-400 hover:text-white px-3 py-1 bg-white/10 rounded-full"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {allAlbums.map((alb) => {
                const isSelected = alb.id === album.id;
                return (
                  <div
                    key={alb.id}
                    onClick={() => {
                      if (onSelectAlbum) onSelectAlbum(alb);
                      setShowQuickPick(false);
                    }}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all ${
                      isSelected 
                        ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]' 
                        : 'border-white/10 hover:border-white/40 hover:scale-[1.03]'
                    }`}
                  >
                    <div className="aspect-square relative overflow-hidden bg-stone-900">
                      <ArtworkImage
                        src={alb.coverUrl}
                        alt={alb.title}
                        title={alb.title}
                        artist={alb.artist}
                        waxColor={alb.waxColor}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <span className="text-xs font-bold text-white truncate">{alb.title}</span>
                        <span className="text-[10px] text-stone-300 truncate">{alb.artist}</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-stone-900/90 text-left">
                      <p className="text-xs font-bold text-amber-100 truncate font-serif-title">{alb.title}</p>
                      <p className="text-[11px] text-stone-400 truncate">{alb.artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
