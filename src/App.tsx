import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Album, TurntableState, ViewMode, SpotifyUserProfile, SlipmatType, ThemeMode } from './types';
import { CURATED_VINYL_COLLECTION, CURATED_PLAYLISTS_COLLECTION } from './data/curatedCollection';
import { audioEngine } from './services/audioEngine';
import { SpotifyAuthService } from './services/spotifyAuth';
import { SpotifyApiService } from './services/spotifyApi';
import { spotifyWebPlayer, SpotifyPlaybackState } from './services/spotifyWebPlayer';
import { Navbar } from './components/Navbar';
import { ShelfView } from './components/ShelfView';
import { GridView } from './components/GridView';
import { TurntablePlayer } from './components/TurntablePlayer';
import { SpotifyConfigModal } from './components/SpotifyConfigModal';
import { AlbumInspectModal } from './components/AlbumInspectModal';
import confetti from 'canvas-confetti';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('turntable');
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserProfile | null>(null);
  const [spotifyAlbums, setSpotifyAlbums] = useState<Album[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<Album[]>([]);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [inspectAlbum, setInspectAlbum] = useState<Album | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [isSpotifyStreamingReady, setIsSpotifyStreamingReady] = useState(false);

  // Global Theme State: Light Mode / Dark Mode
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Sync data-theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('cosyvinyl_theme', theme);
    } catch {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Persistent User Preferences across screens & reloads
  const [scaleLevel, setScaleLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_album_wall_scale');
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  const [dustDensity, setDustDensity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_dust_density');
      return saved ? parseFloat(saved) : 0.6;
    } catch {
      return 0.6;
    }
  });

  const [rumbleVolume, setRumbleVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_rumble_vol');
      return saved ? parseFloat(saved) : 0.25;
    } catch {
      return 0.25;
    }
  });

  const [discMode, setDiscMode] = useState<'label' | 'picture'>(() => {
    try {
      const saved = localStorage.getItem('cosyvinyl_disc_mode');
      return saved === 'picture' ? 'picture' : 'label';
    } catch {
      return 'label';
    }
  });

  // Turntable Master State - Default to Megan Moroney Lucky as in user's photo
  const defaultAlbum = CURATED_VINYL_COLLECTION[0];
  const [turntableState, setTurntableState] = useState<TurntableState>(() => {
    let savedVol = 0.85;
    let savedCrackle = true;
    let savedCrackleVol = 0.45;
    let savedWarmth = true;
    let savedSlipmat: SlipmatType = 'classic-felt';

    try {
      const v = localStorage.getItem('cosyvinyl_volume');
      if (v) savedVol = parseFloat(v);
      const c = localStorage.getItem('cosyvinyl_crackle_enabled');
      if (c !== null) savedCrackle = c === 'true';
      const cv = localStorage.getItem('cosyvinyl_crackle_vol');
      if (cv) savedCrackleVol = parseFloat(cv);
      const w = localStorage.getItem('cosyvinyl_warmth');
      if (w !== null) savedWarmth = w === 'true';
      const s = localStorage.getItem('cosyvinyl_slipmat');
      if (s) savedSlipmat = s as SlipmatType;
    } catch {}

    return {
      isPlaying: false,
      currentAlbum: defaultAlbum,
      currentTrackIndex: 0,
      progressMs: 0,
      durationMs: defaultAlbum.tracks[0]?.durationMs || 198000,
      rpm: defaultAlbum.speed || 33,
      pitchPercent: 0,
      volume: savedVol,
      needleCrackleEnabled: savedCrackle,
      needleCrackleVolume: savedCrackleVol,
      analogWarmth: savedWarmth,
      slipmat: savedSlipmat,
      toneArmStatus: 'resting',
    };
  });

  const cueingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Master User Preferences
  const handleScaleChange = (newScale: number) => {
    setScaleLevel(newScale);
    try {
      localStorage.setItem('cosyvinyl_album_wall_scale', newScale.toString());
    } catch {}
  };

  const handleDustDensityChange = (density: number) => {
    setDustDensity(density);
    try {
      localStorage.setItem('cosyvinyl_dust_density', density.toString());
    } catch {}
  };

  const handleRumbleVolumeChange = (vol: number) => {
    setRumbleVolume(vol);
    try {
      localStorage.setItem('cosyvinyl_rumble_vol', vol.toString());
    } catch {}
  };

  const handleDiscModeChange = (mode: 'label' | 'picture') => {
    setDiscMode(mode);
    try {
      localStorage.setItem('cosyvinyl_disc_mode', mode);
    } catch {}
  };

  // AudioEngine Callbacks for Local / Fallback Previews
  useEffect(() => {
    audioEngine.setCallbacks({
      onTimeUpdate: (currentMs: number, durationMs: number) => {
        // Only use fallback audio engine time if Spotify Web Player isn't streaming
        if (!spotifyUser) {
          setTurntableState((prev) => ({
            ...prev,
            progressMs: currentMs,
            durationMs: durationMs > 0 ? durationMs : prev.durationMs,
          }));
        }
      },
      onEnded: () => {
        handleNextTrack();
      },
      onPlayStateChange: (isPlaying: boolean) => {
        if (!spotifyUser) {
          setTurntableState((prev) => ({
            ...prev,
            isPlaying,
            toneArmStatus: isPlaying ? 'on_record' : 'resting',
          }));
        }
      },
    });
  }, [spotifyUser]);

  // Spotify Web Playback SDK Setup & State Synchronization
  useEffect(() => {
    spotifyWebPlayer.setCallbacks({
      onReady: (deviceId) => {
        console.log('CosyVinyl connected to Spotify device:', deviceId);
        setIsSpotifyStreamingReady(true);
      },
      onNotReady: () => {
        setIsSpotifyStreamingReady(false);
      },
      onStateChange: (state: SpotifyPlaybackState) => {
        setTurntableState((prev) => ({
          ...prev,
          isPlaying: state.isPlaying,
          progressMs: state.positionMs,
          durationMs: state.durationMs > 0 ? state.durationMs : prev.durationMs,
          toneArmStatus: state.isPlaying ? 'on_record' : (prev.toneArmStatus === 'cueing' ? 'cueing' : 'resting'),
        }));
      },
      onError: (msg) => {
        console.warn('Spotify player error notification:', msg);
      },
    });
  }, []);

  // Spotify Auth state & Data Load
  useEffect(() => {
    const token = SpotifyAuthService.getValidAccessToken();
    if (token) {
      loadSpotifyData();
      spotifyWebPlayer.initPlayer();
    }
  }, []);

  const loadSpotifyData = async () => {
    try {
      const user = await SpotifyApiService.getUserProfile();
      setSpotifyUser(user);

      // Initialize Spotify Web Playback SDK for full track streaming
      spotifyWebPlayer.initPlayer();

      const [saved, recent, playlists] = await Promise.allSettled([
        SpotifyApiService.getUserSavedAlbums(50),
        SpotifyApiService.getRecentlyPlayedAlbums(),
        SpotifyApiService.getUserPlaylists(50),
      ]);

      const loadedAlbums: Album[] = [];
      if (saved.status === 'fulfilled') {
        loadedAlbums.push(...saved.value);
      }
      if (recent.status === 'fulfilled') {
        recent.value.forEach((alb) => {
          if (!loadedAlbums.some((a) => a.id === alb.id)) {
            loadedAlbums.push(alb);
          }
        });
      }

      if (loadedAlbums.length > 0) {
        setSpotifyAlbums(loadedAlbums);
      }

      if (playlists.status === 'fulfilled' && playlists.value.length > 0) {
        setSpotifyPlaylists(playlists.value);
      }
    } catch (e) {
      console.warn('Failed to load Spotify data:', e);
    }
  };

  const handleDisconnectSpotify = () => {
    spotifyWebPlayer.disconnect();
    SpotifyAuthService.clearAuth();
    setSpotifyUser(null);
    setSpotifyAlbums([]);
    setSpotifyPlaylists([]);
    setIsSpotifyStreamingReady(false);
  };

  // 1. All Albums (Dedicated exclusively for Albums Tab)
  const allAlbums = useMemo(() => {
    if (spotifyAlbums.length > 0) {
      const combined = [...spotifyAlbums];
      CURATED_VINYL_COLLECTION.forEach((item) => {
        if (!combined.some((a) => a.id === item.id)) {
          combined.push(item);
        }
      });
      return combined;
    }
    return CURATED_VINYL_COLLECTION;
  }, [spotifyAlbums]);

  // 2. All Playlists (Dedicated exclusively for Playlists Tab)
  const allPlaylists = useMemo(() => {
    if (spotifyPlaylists.length > 0) {
      const combined = [...spotifyPlaylists];
      CURATED_PLAYLISTS_COLLECTION.forEach((item) => {
        if (!combined.some((p) => p.id === item.id)) {
          combined.push(item);
        }
      });
      return combined;
    }
    return CURATED_PLAYLISTS_COLLECTION;
  }, [spotifyPlaylists]);

  // 3. Combined Records (For Turntable Picker, Shelf & Unified Search)
  const allRecords = useMemo(() => {
    return [...allAlbums, ...allPlaylists];
  }, [allAlbums, allPlaylists]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((a) => {
      if (a.genre) {
        const clean = a.genre.split('/')[0].trim();
        set.add(clean);
      }
    });
    return Array.from(set).slice(0, 8);
  }, [allRecords]);

  // Filtered Albums
  const filteredAlbums = useMemo(() => {
    return allAlbums.filter((album) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.catalogNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre =
        selectedGenre === 'all' ||
        album.genre.toLowerCase().includes(selectedGenre.toLowerCase());

      return matchesSearch && matchesGenre;
    });
  }, [allAlbums, searchQuery, selectedGenre]);

  // Filtered Playlists
  const filteredPlaylists = useMemo(() => {
    return allPlaylists.filter((playlist) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playlist.catalogNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGenre =
        selectedGenre === 'all' ||
        playlist.genre.toLowerCase().includes(selectedGenre.toLowerCase());

      return matchesSearch && matchesGenre;
    });
  }, [allPlaylists, searchQuery, selectedGenre]);

  // Sync Master Audio Engine Controls & LocalStorage
  useEffect(() => {
    audioEngine.setVolume(turntableState.volume);
    spotifyWebPlayer.setVolume(turntableState.volume);
    try {
      localStorage.setItem('cosyvinyl_volume', turntableState.volume.toString());
    } catch {}
  }, [turntableState.volume]);

  useEffect(() => {
    audioEngine.setWarmth(turntableState.analogWarmth);
    try {
      localStorage.setItem('cosyvinyl_warmth', turntableState.analogWarmth.toString());
    } catch {}
  }, [turntableState.analogWarmth]);

  useEffect(() => {
    audioEngine.setCrackleVolume(
      turntableState.needleCrackleEnabled ? turntableState.needleCrackleVolume : 0
    );
    try {
      localStorage.setItem('cosyvinyl_crackle_enabled', turntableState.needleCrackleEnabled.toString());
      localStorage.setItem('cosyvinyl_crackle_vol', turntableState.needleCrackleVolume.toString());
    } catch {}
  }, [turntableState.needleCrackleEnabled, turntableState.needleCrackleVolume]);

  useEffect(() => {
    audioEngine.setDustDensity(dustDensity);
  }, [dustDensity]);

  useEffect(() => {
    audioEngine.setRumbleVolume(rumbleVolume);
  }, [rumbleVolume]);

  // Synchronize Vinyl Surface Noise
  useEffect(() => {
    if (turntableState.isPlaying && turntableState.toneArmStatus === 'on_record' && turntableState.needleCrackleEnabled) {
      audioEngine.startVinylCrackle();
    } else {
      audioEngine.stopVinylCrackle();
    }
  }, [turntableState.isPlaying, turntableState.toneArmStatus, turntableState.needleCrackleEnabled]);

  // Start Playback Sequence with Tonearm Cueing & Hi-Fi Full Streaming
  const startPlaybackSequence = async (targetAlbum: Album, trackIndex: number) => {
    let resolvedAlbum = targetAlbum;

    // If Spotify playlist has no tracks loaded yet, fetch on demand
    if (resolvedAlbum.isPlaylist && resolvedAlbum.isSpotify && (!resolvedAlbum.tracks || resolvedAlbum.tracks.length === 0)) {
      try {
        const fetchedTracks = await SpotifyApiService.getPlaylistTracks(resolvedAlbum.id);
        if (fetchedTracks && fetchedTracks.length > 0) {
          resolvedAlbum = {
            ...resolvedAlbum,
            tracks: fetchedTracks,
          };
        }
      } catch (e) {
        console.warn('Failed to load playlist tracks:', e);
      }
    }

    const track = resolvedAlbum.tracks[trackIndex] || resolvedAlbum.tracks[0];
    if (!track) return;

    if (cueingTimeoutRef.current) {
      clearTimeout(cueingTimeoutRef.current);
      cueingTimeoutRef.current = null;
    }

    // Immediately stop any currently playing preview audio so tracks NEVER overlap
    audioEngine.stopAudio();

    // 1. Set turntable to cueing and reset progress
    setTurntableState((prev) => ({
      ...prev,
      currentAlbum: resolvedAlbum,
      currentTrackIndex: trackIndex,
      progressMs: 0,
      durationMs: track.durationMs || 180000,
      toneArmStatus: 'cueing',
      isPlaying: true,
      rpm: resolvedAlbum.speed || 33,
    }));

    // 2. Play tactile needle drop sound effect
    audioEngine.playNeedleDrop();

    // 3. Lower tonearm onto record and begin full Hi-Fi track stream
    cueingTimeoutRef.current = setTimeout(async () => {
      setTurntableState((prev) => ({
        ...prev,
        toneArmStatus: 'on_record',
      }));

      // Check if user has Spotify active with track URI
      const isSpotifyPlayable = spotifyUser && track.spotifyUri;

      if (isSpotifyPlayable) {
        // Play full track via Spotify Web Playback SDK / Spotify Connect
        const playedOnSpotify = await spotifyWebPlayer.playSpotifyTrack(track.spotifyUri!, 0);
        if (!playedOnSpotify) {
          // If device was sleeping or inactive, fall back to local preview
          audioEngine.playTrack(
            track.artist || resolvedAlbum.artist,
            track.title,
            track.previewUrl,
            track.durationMs || 180000
          );
        }
      } else {
        // Fallback to local audio engine
        audioEngine.playTrack(
          track.artist || resolvedAlbum.artist,
          track.title,
          track.previewUrl,
          track.durationMs || 180000
        );
      }
    }, 450);
  };

  // Stop Playback Sequence
  const stopPlaybackSequence = () => {
    if (cueingTimeoutRef.current) {
      clearTimeout(cueingTimeoutRef.current);
      cueingTimeoutRef.current = null;
    }

    audioEngine.pauseAudio();
    if (spotifyUser) {
      spotifyWebPlayer.pause();
    }

    setTurntableState((prev) => ({
      ...prev,
      isPlaying: false,
      toneArmStatus: 'returning',
    }));

    setTimeout(() => {
      setTurntableState((prev) => ({
        ...prev,
        toneArmStatus: 'resting',
      }));
    }, 400);
  };

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (!turntableState.currentAlbum) return;

    if (turntableState.isPlaying) {
      stopPlaybackSequence();
    } else {
      if (spotifyUser && turntableState.progressMs > 0) {
        spotifyWebPlayer.resume();
        setTurntableState((prev) => ({ ...prev, isPlaying: true, toneArmStatus: 'on_record' }));
      } else {
        startPlaybackSequence(turntableState.currentAlbum, turntableState.currentTrackIndex);
      }
    }
  };

  // Drop an album directly onto the turntable
  const handlePlayAlbum = (album: Album) => {
    setViewMode('turntable');
    startPlaybackSequence(album, 0);
    
    try {
      confetti({
        particleCount: 30,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#10b981', '#f59e0b', '#d97706', '#be123c'],
      });
    } catch (e) {}
  };

  const handleSelectTrack = (trackIndex: number) => {
    if (!turntableState.currentAlbum) return;
    startPlaybackSequence(turntableState.currentAlbum, trackIndex);
  };

  const handleNextTrack = () => {
    if (!turntableState.currentAlbum) return;
    const tracks = turntableState.currentAlbum.tracks;
    if (tracks.length === 0) return;
    const nextIdx = (turntableState.currentTrackIndex + 1) % tracks.length;
    startPlaybackSequence(turntableState.currentAlbum, nextIdx);
  };

  const handlePrevTrack = () => {
    if (!turntableState.currentAlbum) return;
    const tracks = turntableState.currentAlbum.tracks;
    if (tracks.length === 0) return;
    const prevIdx = (turntableState.currentTrackIndex - 1 + tracks.length) % tracks.length;
    startPlaybackSequence(turntableState.currentAlbum, prevIdx);
  };

  const handleSeek = (ms: number) => {
    setTurntableState((prev) => ({ ...prev, progressMs: ms }));
    if (spotifyUser) {
      spotifyWebPlayer.seek(ms);
    } else {
      audioEngine.seekAudio(ms / 1000);
    }
  };

  const handleSetRpm = (rpm: 33 | 45) => {
    setTurntableState((prev) => ({ ...prev, rpm }));
    audioEngine.setPlaybackRate(rpm === 45 ? 1.35 : 1.0);
  };

  const handleSetPitch = (pitch: number) => {
    setTurntableState((prev) => ({ ...prev, pitchPercent: pitch }));
    const base = turntableState.rpm === 45 ? 1.35 : 1.0;
    audioEngine.setPlaybackRate(base * (1 + pitch / 100));
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-[#f6f1ea] text-stone-900 selection:bg-amber-500/25 selection:text-amber-900'
        : 'bg-[#0d0a08] text-stone-100 selection:bg-amber-500/30 selection:text-amber-200'
    }`}>
      
      {/* Sleek Minimal Top Navigation */}
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        spotifyUser={spotifyUser}
        onOpenSpotifyModal={() => setIsSpotifyModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        genres={genres}
        isPlaying={turntableState.isPlaying}
        currentAlbumTitle={turntableState.currentAlbum?.title}
        onQuickJumpTurntable={() => setViewMode('turntable')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Experience View Area */}
      <main className="flex-1 flex flex-col justify-start">
        {viewMode === 'turntable' && (
          <TurntablePlayer
            album={turntableState.currentAlbum}
            state={turntableState}
            onPlayPause={handlePlayPause}
            onSelectTrack={handleSelectTrack}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            onSeek={handleSeek}
            onSetRpm={handleSetRpm}
            onSetPitch={handleSetPitch}
            onSetVolume={(vol) => setTurntableState((prev) => ({ ...prev, volume: vol }))}
            onToggleCrackle={() =>
              setTurntableState((prev) => ({
                ...prev,
                needleCrackleEnabled: !prev.needleCrackleEnabled,
              }))
            }
            onSetCrackleVolume={(vol) =>
              setTurntableState((prev) => ({
                ...prev,
                needleCrackleVolume: vol,
              }))
            }
            onSetDustDensity={handleDustDensityChange}
            onSetRumbleVolume={handleRumbleVolumeChange}
            onToggleWarmth={() =>
              setTurntableState((prev) => ({
                ...prev,
                analogWarmth: !prev.analogWarmth,
              }))
            }
            onSetSlipmat={(mat: SlipmatType) => {
              setTurntableState((prev) => ({ ...prev, slipmat: mat }));
              try {
                localStorage.setItem('cosyvinyl_slipmat', mat);
              } catch {}
            }}
            onBackToShelf={() => setViewMode('grid')}
            onOpenInspect={() => setInspectAlbum(turntableState.currentAlbum)}
            allAlbums={allRecords}
            onSelectAlbum={(alb) => {
              setTurntableState((prev) => ({ ...prev, currentAlbum: alb, currentTrackIndex: 0 }));
              startPlaybackSequence(alb, 0);
            }}
            isSpotifyActive={!!spotifyUser}
            discMode={discMode}
            onSetDiscMode={handleDiscModeChange}
            dustDensity={dustDensity}
            rumbleVolume={rumbleVolume}
            theme={theme}
          />
        )}

        {viewMode === 'grid' && (
          <GridView
            albums={filteredAlbums}
            selectedAlbum={turntableState.currentAlbum}
            onSelectAlbum={(alb) => setTurntableState((prev) => ({ ...prev, currentAlbum: alb }))}
            onPlayAlbum={handlePlayAlbum}
            onInspectAlbum={(alb) => setInspectAlbum(alb)}
            scaleLevel={scaleLevel}
            onScaleChange={handleScaleChange}
            viewType="albums"
            theme={theme}
          />
        )}

        {viewMode === 'playlists' && (
          <GridView
            albums={filteredPlaylists}
            selectedAlbum={turntableState.currentAlbum}
            onSelectAlbum={(alb) => setTurntableState((prev) => ({ ...prev, currentAlbum: alb }))}
            onPlayAlbum={handlePlayAlbum}
            onInspectAlbum={(alb) => setInspectAlbum(alb)}
            scaleLevel={scaleLevel}
            onScaleChange={handleScaleChange}
            viewType="playlists"
            theme={theme}
          />
        )}

        {viewMode === 'shelf' && (
          <ShelfView
            albums={allRecords}
            selectedAlbum={turntableState.currentAlbum}
            onSelectAlbum={(alb) => setTurntableState((prev) => ({ ...prev, currentAlbum: alb }))}
            onPlayAlbum={handlePlayAlbum}
            onInspectAlbum={(alb) => setInspectAlbum(alb)}
            theme={theme}
          />
        )}
      </main>

      {/* Spotify Connection Modal */}
      <SpotifyConfigModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
        user={spotifyUser}
        onConnectSuccess={() => {
          loadSpotifyData();
          try {
            confetti({ particleCount: 35, spread: 70 });
          } catch (e) {}
        }}
        onDisconnect={handleDisconnectSpotify}
      />

      {/* Liner Notes & Inspection Modal */}
      <AlbumInspectModal
        album={inspectAlbum}
        onClose={() => setInspectAlbum(null)}
        onPlayAlbum={handlePlayAlbum}
      />

    </div>
  );
}
