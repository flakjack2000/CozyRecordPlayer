// Web Audio API Analog Vinyl & Sound Engine with Real Audio Resolver & Lo-Fi Lounge Synthesizer

export interface AudioEngineCallbacks {
  onTimeUpdate?: (currentTimeMs: number, durationMs: number) => void;
  onEnded?: () => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onAudioSourceReady?: (sourceType: 'stream' | 'lofi') => void;
}

class VinylAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private warmthFilterLow: BiquadFilterNode | null = null;
  private warmthFilterHigh: BiquadFilterNode | null = null;
  
  // Vinyl Surface & Crackle Nodes
  private crackleGain: GainNode | null = null;
  private surfaceNoiseGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private crackleIntervalId: any = null;
  
  // Single Audio Element with strict cancellation token
  private audioElement: HTMLAudioElement | null = null;
  private isCracklePlaying = false;
  private currentPlayId = 0;
  private previewCache: Map<string, string> = new Map();
  private callbacks: AudioEngineCallbacks = {};

  // Settings
  private masterVolume = 0.85;
  private crackleUserVolume = 0.45;
  private dustDensity = 0.6;
  private rumbleUserVolume = 0.25;
  private isWarmthEnabled = true;

  // Generative Lo-Fi Synthesizer & Beats Engine
  private isLofiSynthPlaying = false;
  private lofiGain: GainNode | null = null;
  private lofiIntervalId: any = null;
  private lofiBeatIntervalId: any = null;
  private currentChordIndex = 0;
  private lofiCurrentTimeMs = 0;
  private lofiTickerIntervalId: any = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserDataArray: Uint8Array | null = null;

  public init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.setupGraph();
      }
    }
    this.resumeContext();
  }

  public async resumeContext(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext resume error:', e);
      }
    }
  }

  private setupGraph() {
    if (!this.audioCtx) return;

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);

    // Warm analog EQ curve (tube preamp color)
    this.warmthFilterLow = this.audioCtx.createBiquadFilter();
    this.warmthFilterLow.type = 'lowshelf';
    this.warmthFilterLow.frequency.value = 240;
    this.warmthFilterLow.gain.value = this.isWarmthEnabled ? 3.5 : 0; // +3.5dB warm analog low-end

    this.warmthFilterHigh = this.audioCtx.createBiquadFilter();
    this.warmthFilterHigh.type = 'highshelf';
    this.warmthFilterHigh.frequency.value = 9000;
    this.warmthFilterHigh.gain.value = this.isWarmthEnabled ? -2.2 : 0; // subtle smooth high rolloff

    // Analyser for real-time VU meter
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.analyserDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.warmthFilterLow.connect(this.warmthFilterHigh);
    this.warmthFilterHigh.connect(this.analyserNode);
    this.analyserNode.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    // Crackle sub-graph with direct master connection
    this.crackleGain = this.audioCtx.createGain();
    this.crackleGain.gain.setValueAtTime(this.crackleUserVolume * 0.45, this.audioCtx.currentTime);
    this.crackleGain.connect(this.masterGain);

    this.surfaceNoiseGain = this.audioCtx.createGain();
    this.surfaceNoiseGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    this.surfaceNoiseGain.connect(this.crackleGain);

    // Turntable Platter Sub-bass Rumble
    this.rumbleGain = this.audioCtx.createGain();
    this.rumbleGain.gain.setValueAtTime(this.rumbleUserVolume * 0.15, this.audioCtx.currentTime);
    this.rumbleGain.connect(this.masterGain);

    // Lo-Fi Synth sub-graph
    this.lofiGain = this.audioCtx.createGain();
    this.lofiGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
    this.lofiGain.connect(this.warmthFilterLow);
  }

  public setCallbacks(cbs: AudioEngineCallbacks) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  public getAudioLevel(): number {
    if (!this.analyserNode || !this.analyserDataArray) return 0;
    this.analyserNode.getByteFrequencyData(this.analyserDataArray);
    let sum = 0;
    for (let i = 0; i < this.analyserDataArray.length; i++) {
      sum += this.analyserDataArray[i];
    }
    return sum / (this.analyserDataArray.length * 255);
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.masterVolume;
    }
  }

  public setWarmth(enabled: boolean) {
    this.isWarmthEnabled = enabled;
    if (!this.audioCtx || !this.warmthFilterLow || !this.warmthFilterHigh) return;
    if (enabled) {
      this.warmthFilterLow.gain.setTargetAtTime(3.8, this.audioCtx.currentTime, 0.1);
      this.warmthFilterHigh.gain.setTargetAtTime(-2.4, this.audioCtx.currentTime, 0.1);
    } else {
      this.warmthFilterLow.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
      this.warmthFilterHigh.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
    }
  }

  public setCrackleVolume(vol: number) {
    this.crackleUserVolume = Math.max(0, Math.min(1, vol));
    if (this.crackleGain && this.audioCtx) {
      this.crackleGain.gain.setTargetAtTime(this.crackleUserVolume * 0.45, this.audioCtx.currentTime, 0.05);
    }
  }

  public setDustDensity(density: number) {
    this.dustDensity = Math.max(0.1, Math.min(1.0, density));
  }

  public setRumbleVolume(vol: number) {
    this.rumbleUserVolume = Math.max(0, Math.min(1, vol));
    if (this.rumbleGain && this.audioCtx) {
      this.rumbleGain.gain.setTargetAtTime(this.rumbleUserVolume * 0.18, this.audioCtx.currentTime, 0.05);
    }
  }

  // Play realistic tactile needle drop bump & friction
  public playNeedleDrop() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    this.resumeContext();

    try {
      const now = this.audioCtx.currentTime;
      
      // 1. Low rumble mechanical thud
      const osc = this.audioCtx.createOscillator();
      const popGain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

      popGain.gain.setValueAtTime(0.6 * this.masterVolume, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(popGain);
      popGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.26);

      // 2. Diamond stylus friction scrape
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.22);
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1800;
      noiseFilter.Q.value = 2.5;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * this.masterVolume, now + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start(now + 0.02);
    } catch (e) {
      console.warn('Needle drop sound glitch:', e);
    }
  }

  // Tonearm pickup sound
  public playArmLift() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    this.resumeContext();

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // Continuous vinyl surface noise, motor hum, and dust clicks
  public startVinylCrackle() {
    this.init();
    if (!this.audioCtx || !this.crackleGain) return;
    this.resumeContext();

    if (this.isCracklePlaying) return;
    this.isCracklePlaying = true;

    try {
      // 1. Continuous vinyl micro-groove surface hiss
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const surfaceFilter = this.audioCtx.createBiquadFilter();
      surfaceFilter.type = 'bandpass';
      surfaceFilter.frequency.value = 1400;
      surfaceFilter.Q.value = 0.9;

      noiseSource.connect(surfaceFilter);
      if (this.surfaceNoiseGain) {
        surfaceFilter.connect(this.surfaceNoiseGain);
      } else {
        surfaceFilter.connect(this.crackleGain);
      }
      noiseSource.start();
      this.noiseNode = noiseSource;

      // 2. Continuous 33.3Hz Turntable Motor & Platter Rumble
      if (this.rumbleGain && !this.rumbleOsc) {
        const rumble = this.audioCtx.createOscillator();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(33.3, this.audioCtx.currentTime);
        rumble.connect(this.rumbleGain);
        rumble.start();
        this.rumbleOsc = rumble;
      }

      // 3. Periodic vinyl ticks & dust clicks
      const intervalMs = Math.max(70, Math.round(180 / (this.dustDensity + 0.2)));
      this.crackleIntervalId = setInterval(() => {
        if (!this.audioCtx || !this.crackleGain || !this.isCracklePlaying) return;
        
        if (Math.random() < (this.dustDensity * 0.75 + 0.2)) {
          const clickNow = this.audioCtx.currentTime;
          const osc = this.audioCtx.createOscillator();
          const clickGain = this.audioCtx.createGain();
          
          osc.type = Math.random() > 0.4 ? 'triangle' : 'square';
          osc.frequency.setValueAtTime(1200 + Math.random() * 5000, clickNow);
          
          const clickIntensity = Math.random() * 0.25 + 0.08;
          clickGain.gain.setValueAtTime(clickIntensity, clickNow);
          clickGain.gain.exponentialRampToValueAtTime(0.0001, clickNow + 0.022);

          osc.connect(clickGain);
          clickGain.connect(this.crackleGain);

          osc.start(clickNow);
          osc.stop(clickNow + 0.028);
        }
      }, intervalMs);
    } catch (e) {
      console.warn('Vinyl crackle init error:', e);
    }
  }

  public stopVinylCrackle() {
    this.isCracklePlaying = false;
    if (this.crackleIntervalId) {
      clearInterval(this.crackleIntervalId);
      this.crackleIntervalId = null;
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
      } catch (e) {}
      this.noiseNode = null;
    }
    if (this.rumbleOsc) {
      try {
        this.rumbleOsc.stop();
      } catch (e) {}
      this.rumbleOsc = null;
    }
  }

  // Quick instant test for vinyl sounds in the dial-in menu
  public testVinylSound() {
    this.init();
    this.resumeContext();
    this.playNeedleDrop();
    this.startVinylCrackle();
    setTimeout(() => {
      // If no music is currently playing, turn crackle back off after 3.5s
      if (!this.audioElement || this.audioElement.paused) {
        this.stopVinylCrackle();
        this.playArmLift();
      }
    }, 3500);
  }

  // -------------------------------------------------------------
  // Dynamic Real-Time Audio Preview Resolver (iTunes Search API)
  // -------------------------------------------------------------
  public async resolveAudioPreview(artist: string, trackTitle: string): Promise<string | null> {
    const cacheKey = `${artist.trim().toLowerCase()} - ${trackTitle.trim().toLowerCase()}`;
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey)!;
    }

    try {
      const cleanTitle = trackTitle
        .replace(/\(feat.*?\)/gi, '')
        .replace(/\(with.*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/- Remastered.*/gi, '')
        .trim();
      
      const query = encodeURIComponent(`${artist} ${cleanTitle}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
          const url = data.results[0].previewUrl;
          this.previewCache.set(cacheKey, url);
          return url;
        }
      }
    } catch (err) {
      console.warn('Preview lookup error:', err);
    }

    return null;
  }

  // -------------------------------------------------------------
  // Play Track with Cancellation Token & Real-time Progress Binding
  // -------------------------------------------------------------
  public async playTrack(
    artist: string,
    title: string,
    directUrl?: string,
    expectedDurationMs: number = 180000
  ) {
    this.init();
    this.resumeContext();
    
    // Increment play session ID to immediately invalidate any in-flight async requests
    const thisPlayId = ++this.currentPlayId;

    // Fully terminate any existing audio element or synth before loading
    this.stopAudio();
    this.stopLofiSynth();

    let streamUrl: string | null = directUrl || null;

    if (!streamUrl) {
      streamUrl = await this.resolveAudioPreview(artist, title);
    }

    // If another track was selected while awaiting resolution, abort immediately
    if (thisPlayId !== this.currentPlayId) {
      return;
    }

    if (streamUrl) {
      this.playStreamAudio(streamUrl, thisPlayId, expectedDurationMs);
    } else {
      // Graceful fallback to real-time generative lo-fi analog synthesizer
      this.startLofiSynth(expectedDurationMs);
    }
  }

  private playStreamAudio(url: string, playId: number, expectedDurationMs: number) {
    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = url;
      audio.volume = this.masterVolume;
      this.audioElement = audio;

      audio.addEventListener('timeupdate', () => {
        if (this.currentPlayId !== playId) return;
        const currentMs = audio.currentTime * 1000;
        const durMs = (audio.duration && !isNaN(audio.duration) && audio.duration > 0) 
          ? audio.duration * 1000 
          : expectedDurationMs;
        if (this.callbacks.onTimeUpdate) {
          this.callbacks.onTimeUpdate(currentMs, durMs);
        }
      });

      audio.addEventListener('ended', () => {
        if (this.currentPlayId !== playId) return;
        if (this.callbacks.onEnded) {
          this.callbacks.onEnded();
        }
      });

      audio.play().then(() => {
        if (this.callbacks.onPlayStateChange) {
          this.callbacks.onPlayStateChange(true);
        }
        if (this.callbacks.onAudioSourceReady) {
          this.callbacks.onAudioSourceReady('stream');
        }
      }).catch((e) => {
        console.warn('Playback error, switching to Lo-Fi synth:', e);
        this.startLofiSynth(expectedDurationMs);
      });
    } catch (e) {
      this.startLofiSynth(expectedDurationMs);
    }
  }

  public pauseAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.isLofiSynthPlaying) {
      this.pauseLofiSynth();
    }
    if (this.callbacks.onPlayStateChange) {
      this.callbacks.onPlayStateChange(false);
    }
  }

  public resumeAudio() {
    this.resumeContext();
    if (this.audioElement && this.audioElement.src) {
      this.audioElement.play().catch(() => {});
      if (this.callbacks.onPlayStateChange) {
        this.callbacks.onPlayStateChange(true);
      }
    } else if (this.isLofiSynthPlaying) {
      this.resumeLofiSynth();
    }
  }

  public stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement.src = '';
      this.audioElement = null;
    }
  }

  public seekAudio(seconds: number) {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, seconds);
    } else if (this.isLofiSynthPlaying) {
      this.lofiCurrentTimeMs = seconds * 1000;
    }
  }

  public setPlaybackRate(rate: number) {
    if (this.audioElement) {
      this.audioElement.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  // -------------------------------------------------------------
  // Generative Warm Lo-Fi Lounge Chord & Beat Synthesizer
  // -------------------------------------------------------------
  private lofiChords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 349.23], // G7
  ];

  public startLofiSynth(durationMs: number = 180000) {
    this.init();
    if (!this.audioCtx || !this.lofiGain) return;
    this.resumeContext();

    this.isLofiSynthPlaying = true;
    this.lofiCurrentTimeMs = 0;

    if (this.callbacks.onPlayStateChange) {
      this.callbacks.onPlayStateChange(true);
    }
    if (this.callbacks.onAudioSourceReady) {
      this.callbacks.onAudioSourceReady('lofi');
    }

    this.currentChordIndex = 0;
    this.triggerChord();

    this.lofiIntervalId = setInterval(() => {
      if (!this.isLofiSynthPlaying) return;
      this.currentChordIndex = (this.currentChordIndex + 1) % this.lofiChords.length;
      this.triggerChord();
    }, 2800);

    // Subtle soft lo-fi lounge brush beat
    this.lofiBeatIntervalId = setInterval(() => {
      if (!this.isLofiSynthPlaying) return;
      this.triggerSoftBrush();
    }, 700);

    this.lofiTickerIntervalId = setInterval(() => {
      if (!this.isLofiSynthPlaying) return;
      this.lofiCurrentTimeMs += 250;
      if (this.callbacks.onTimeUpdate) {
        this.callbacks.onTimeUpdate(this.lofiCurrentTimeMs, durationMs);
      }
      if (this.lofiCurrentTimeMs >= durationMs) {
        this.stopLofiSynth();
        if (this.callbacks.onEnded) this.callbacks.onEnded();
      }
    }, 250);
  }

  private triggerChord() {
    if (!this.audioCtx || !this.lofiGain || !this.isLofiSynthPlaying) return;
    const now = this.audioCtx.currentTime;
    const chord = this.lofiChords[this.currentChordIndex];

    chord.forEach((freq) => {
      const osc = this.audioCtx!.createOscillator();
      const noteGain = this.audioCtx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);

      osc.connect(noteGain);
      noteGain.connect(this.lofiGain!);

      osc.start(now);
      osc.stop(now + 2.75);
    });
  }

  private triggerSoftBrush() {
    if (!this.audioCtx || !this.lofiGain || !this.isLofiSynthPlaying) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.lofiGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public pauseLofiSynth() {
    this.isLofiSynthPlaying = false;
    if (this.lofiIntervalId) clearInterval(this.lofiIntervalId);
    if (this.lofiBeatIntervalId) clearInterval(this.lofiBeatIntervalId);
    if (this.lofiTickerIntervalId) clearInterval(this.lofiTickerIntervalId);
  }

  public resumeLofiSynth() {
    this.isLofiSynthPlaying = true;
    this.startLofiSynth();
  }

  public stopLofiSynth() {
    this.isLofiSynthPlaying = false;
    if (this.lofiIntervalId) clearInterval(this.lofiIntervalId);
    if (this.lofiBeatIntervalId) clearInterval(this.lofiBeatIntervalId);
    if (this.lofiTickerIntervalId) clearInterval(this.lofiTickerIntervalId);
    this.lofiIntervalId = null;
    this.lofiBeatIntervalId = null;
    this.lofiTickerIntervalId = null;
  }
}

export const audioEngine = new VinylAudioEngine();
