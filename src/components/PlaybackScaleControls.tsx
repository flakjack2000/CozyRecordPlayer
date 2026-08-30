import React, { useState, useRef, useEffect } from 'react';
import { 
  TurntableLayoutPreset, 
  MaximizedScaleConfig, 
  ClassicScaleConfig, 
  SplitExperimentConfig 
} from '../types';
import { 
  Maximize2, 
  Columns3, 
  Columns2, 
  SlidersHorizontal, 
  RotateCcw, 
  Layers, 
  X, 
  ZoomIn, 
  ZoomOut,
  Sliders,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlaybackScaleControlsProps {
  layoutPreset: TurntableLayoutPreset;
  onSetPreset: (preset: TurntableLayoutPreset) => void;
  maximizedConfig: MaximizedScaleConfig;
  onUpdateMaximizedConfig: (updates: Partial<MaximizedScaleConfig>) => void;
  onResetMaximizedConfig: () => void;
  classicConfig: ClassicScaleConfig;
  onUpdateClassicConfig: (updates: Partial<ClassicScaleConfig>) => void;
  onResetClassicConfig: () => void;
  splitConfig: SplitExperimentConfig;
  onUpdateSplitConfig: (updates: Partial<SplitExperimentConfig>) => void;
  onResetSplitConfig: () => void;
  showExperimentDrawer?: boolean;
  onToggleExperimentDrawer?: () => void;
  compact?: boolean;
}

export const PlaybackScaleControls: React.FC<PlaybackScaleControlsProps> = ({
  layoutPreset,
  onSetPreset,
  maximizedConfig,
  onUpdateMaximizedConfig,
  onResetMaximizedConfig,
  classicConfig,
  onUpdateClassicConfig,
  onResetClassicConfig,
  splitConfig,
  onUpdateSplitConfig,
  onResetSplitConfig,
  showExperimentDrawer,
  onToggleExperimentDrawer,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Current active scale readout
  const activeScaleDisplay = 
    layoutPreset === 'maximized'
      ? `${maximizedConfig.turntableScale}%`
      : layoutPreset === 'classic'
      ? `${classicConfig.turntableScale}%`
      : `${splitConfig.vinylSize}px`;

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono" ref={popoverRef}>
      
      {/* UI PRESET SELECTOR (Option 1 / Option 2 / Option 3) */}
      <div className="flex items-center gap-1 bg-stone-900/90 border border-white/15 p-1 rounded-2xl shadow-lg">
        <button
          id="btn-preset-maximized"
          onClick={() => onSetPreset('maximized')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            layoutPreset === 'maximized'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-white'
          }`}
          title="Option 1: Maximized Turntable Focus with Floating Tracklist"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Opt 1: </span>
          <span className="text-[11px]">Maximized</span>
        </button>

        <button
          id="btn-preset-classic"
          onClick={() => onSetPreset('classic')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            layoutPreset === 'classic'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-white'
          }`}
          title="Option 2: 3-Column Classic Studio Layout"
        >
          <Columns3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Opt 2: </span>
          <span className="text-[11px]">3-Column</span>
        </button>

        <button
          id="btn-preset-split"
          onClick={() => onSetPreset('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            layoutPreset === 'split'
              ? 'bg-amber-500 text-stone-950 font-bold shadow'
              : 'text-stone-400 hover:text-white'
          }`}
          title="Option 3: Split View (Minimalist Vinyl + Sleeve with Sliders)"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Opt 3: </span>
          <span className="text-[11px]">Split</span>
        </button>
      </div>

      {/* SCALE CONTROLS TRIGGER BUTTON */}
      <button
        id="btn-toggle-scale-controls"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border transition-all ${
          isOpen
            ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md'
            : 'bg-stone-900/90 text-stone-300 border-white/15 hover:text-white hover:bg-stone-800'
        }`}
        title="Adjust View Scale & Dimensions"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-bold">Scale: {activeScaleDisplay}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-stone-950' : 'text-stone-400'}`} />
      </button>

      {/* FLOATING SCALE POPOVER PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-full right-0 mb-3 z-50 w-80 sm:w-96 bg-stone-950/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-[0_25px_70px_rgba(0,0,0,0.95)]"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h4 className="font-serif-title font-bold text-white text-sm">
                  {layoutPreset === 'maximized'
                    ? 'Option 1 Scale Adjustments'
                    : layoutPreset === 'classic'
                    ? 'Option 2 (3-Column) Scale'
                    : 'Option 3 (Split View) Scale'}
                </h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* OPTION 1 (MAXIMIZED) SLIDERS */}
            {layoutPreset === 'maximized' && (
              <div className="space-y-4 text-xs font-mono">
                {/* Turntable Platter Deck Scale */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Turntable Deck Scale:</span>
                    <span className="text-amber-400 font-bold text-sm">{maximizedConfig.turntableScale}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateMaximizedConfig({ turntableScale: Math.max(70, maximizedConfig.turntableScale - 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                      title="Shrink 5%"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={2}
                      value={maximizedConfig.turntableScale}
                      onChange={(e) => onUpdateMaximizedConfig({ turntableScale: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => onUpdateMaximizedConfig({ turntableScale: Math.min(140, maximizedConfig.turntableScale + 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                      title="Enlarge 5%"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Album Sleeve Scale */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Album Sleeve Scale:</span>
                    <span className="text-amber-400 font-bold text-sm">{maximizedConfig.sleeveScale}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateMaximizedConfig({ sleeveScale: Math.max(70, maximizedConfig.sleeveScale - 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                      title="Shrink 5%"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={2}
                      value={maximizedConfig.sleeveScale}
                      onChange={(e) => onUpdateMaximizedConfig({ sleeveScale: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => onUpdateMaximizedConfig({ sleeveScale: Math.min(140, maximizedConfig.sleeveScale + 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                      title="Enlarge 5%"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets & Reset */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateMaximizedConfig({ turntableScale: 85, sleeveScale: 85 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-stone-300"
                    >
                      85%
                    </button>
                    <button
                      onClick={() => onUpdateMaximizedConfig({ turntableScale: 100, sleeveScale: 100 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-amber-400 font-bold"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => onUpdateMaximizedConfig({ turntableScale: 120, sleeveScale: 120 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-stone-300"
                    >
                      120%
                    </button>
                  </div>

                  <button
                    onClick={onResetMaximizedConfig}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-[11px] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}

            {/* OPTION 2 (3-COLUMN) SLIDERS */}
            {layoutPreset === 'classic' && (
              <div className="space-y-4 text-xs font-mono">
                {/* Turntable Platter Scale */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Col 3 Turntable Scale:</span>
                    <span className="text-amber-400 font-bold text-sm">{classicConfig.turntableScale}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateClassicConfig({ turntableScale: Math.max(70, classicConfig.turntableScale - 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      step={2}
                      value={classicConfig.turntableScale}
                      onChange={(e) => onUpdateClassicConfig({ turntableScale: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => onUpdateClassicConfig({ turntableScale: Math.min(130, classicConfig.turntableScale + 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Album Sleeve Stand Scale */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Col 2 Sleeve Stand Scale:</span>
                    <span className="text-amber-400 font-bold text-sm">{classicConfig.sleeveScale}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateClassicConfig({ sleeveScale: Math.max(70, classicConfig.sleeveScale - 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      step={2}
                      value={classicConfig.sleeveScale}
                      onChange={(e) => onUpdateClassicConfig({ sleeveScale: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => onUpdateClassicConfig({ sleeveScale: Math.min(130, classicConfig.sleeveScale + 5) })}
                      className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets & Reset */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateClassicConfig({ turntableScale: 85, sleeveScale: 85 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-stone-300"
                    >
                      85%
                    </button>
                    <button
                      onClick={() => onUpdateClassicConfig({ turntableScale: 100, sleeveScale: 100 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-amber-400 font-bold"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => onUpdateClassicConfig({ turntableScale: 115, sleeveScale: 115 })}
                      className="px-2 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-white/10 text-[10px] text-stone-300"
                    >
                      115%
                    </button>
                  </div>

                  <button
                    onClick={onResetClassicConfig}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-[11px] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}

            {/* OPTION 3 (SPLIT VIEW) SLIDERS */}
            {layoutPreset === 'split' && (
              <div className="space-y-4 text-xs font-mono">
                {/* Vinyl Record Size */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Vinyl Disc Size:</span>
                    <span className="text-amber-400 font-bold text-sm">{splitConfig.vinylSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={240}
                    max={680}
                    step={5}
                    value={splitConfig.vinylSize}
                    onChange={(e) => onUpdateSplitConfig({ vinylSize: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Album Sleeve Size */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-300">Album Sleeve Size:</span>
                    <span className="text-amber-400 font-bold text-sm">{splitConfig.sleeveSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={240}
                    max={680}
                    step={5}
                    value={splitConfig.sleeveSize}
                    onChange={(e) => onUpdateSplitConfig({ sleeveSize: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Typography scale */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-stone-300 text-[10px]">Title Font:</span>
                      <span className="text-amber-400 font-bold text-[10px]">{splitConfig.titleFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={54}
                      step={1}
                      value={splitConfig.titleFontSize}
                      onChange={(e) => onUpdateSplitConfig({ titleFontSize: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-stone-300 text-[10px]">Track Font:</span>
                      <span className="text-amber-400 font-bold text-[10px]">{splitConfig.trackTitleFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={44}
                      step={1}
                      value={splitConfig.trackTitleFontSize}
                      onChange={(e) => onUpdateSplitConfig({ trackTitleFontSize: parseInt(e.target.value) })}
                      className="w-full accent-amber-500 h-1 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Open full Lab & Reset */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  {onToggleExperimentDrawer && (
                    <button
                      onClick={() => {
                        onToggleExperimentDrawer();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] transition-all shadow"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{showExperimentDrawer ? 'Close Lab Drawer' : 'Full Lab Drawer'}</span>
                    </button>
                  )}

                  <button
                    onClick={onResetSplitConfig}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-[11px] transition-colors ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
