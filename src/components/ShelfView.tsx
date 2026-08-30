import React, { useState } from 'react';
import { Album, ThemeMode } from '../types';
import { Play, Info, Disc3, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ArtworkImage } from './ArtworkImage';

interface ShelfViewProps {
  albums: Album[];
  selectedAlbum: Album | null;
  onSelectAlbum: (album: Album) => void;
  onPlayAlbum: (album: Album) => void;
  onInspectAlbum: (album: Album) => void;
  theme?: ThemeMode;
}

export const ShelfView: React.FC<ShelfViewProps> = ({
  albums,
  selectedAlbum,
  onSelectAlbum,
  onPlayAlbum,
  onInspectAlbum,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeSlideout, setActiveSlideout] = useState<Album | null>(null);

  // Group albums into shelves of up to 14 records per row on ultrawide
  const itemsPerShelf = 12;
  const shelves: Album[][] = [];
  for (let i = 0; i < albums.length; i += itemsPerShelf) {
    shelves.push(albums.slice(i, i + itemsPerShelf));
  }

  return (
    <div className="w-full max-w-[2400px] mx-auto py-8 px-4 sm:px-8 lg:px-12">
      
      {/* Shelf Header */}
      <div className={`flex items-center justify-between mb-6 pb-2 border-b text-xs font-mono transition-colors ${
        isLight ? 'border-stone-300 text-stone-600' : 'border-stone-800 text-stone-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-bold">VINTAGE WALNUT BOOKSHELF • {albums.length} LP SPINES</span>
        </div>
        <span className={isLight ? 'text-stone-500' : 'text-stone-500'}>
          Hover spine to pull sleeve • Click to draw record
        </span>
      </div>

      {/* Shelves Column */}
      <div className="space-y-12">
        {shelves.map((shelfAlbums, shelfIdx) => (
          <div key={`shelf-${shelfIdx}`} className="relative">
            
            {/* Shelf Back Wall */}
            <div className={`relative rounded-xl p-4 pt-8 pb-3 border shadow-2xl transition-colors ${
              isLight 
                ? 'bg-stone-200/90 border-stone-300 shadow-stone-400/20' 
                : 'bg-stone-950/80 border-stone-800/80 shadow-black/80'
            }`}>
              
              {/* Upright Vinyl Spines Container */}
              <div className="flex items-end justify-start gap-1.5 sm:gap-3.5 h-[280px] sm:h-[340px] px-3 sm:px-6 overflow-x-auto perspective-1000 no-scrollbar">
                {shelfAlbums.map((album) => {
                  const isHovered = hoveredId === album.id;
                  const isSelected = selectedAlbum?.id === album.id || activeSlideout?.id === album.id;

                  return (
                    <div
                      key={album.id}
                      className="relative shrink-0 flex items-end cursor-pointer group"
                      onMouseEnter={() => setHoveredId(album.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => {
                        onSelectAlbum(album);
                        setActiveSlideout(album);
                      }}
                    >
                      {/* Vinyl Spine (Sleeve standing upright) */}
                      <motion.div
                        animate={{
                          y: isHovered || isSelected ? -30 : 0,
                          z: isHovered || isSelected ? 40 : 0,
                          rotateY: isHovered ? -8 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`relative w-8 sm:w-11 h-[250px] sm:h-[300px] rounded-t-sm shadow-xl flex flex-col justify-between p-1 border transition-colors select-none ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-500/40'
                            : 'border-stone-800/90 hover:border-stone-600'
                        }`}
                        style={{
                          backgroundColor: album.spineColor || '#292524',
                        }}
                      >
                        {/* Top Spine Code */}
                        <div className="text-[9px] font-mono text-stone-400 text-center truncate uppercase">
                          {album.catalogNumber.substring(0, 5)}
                        </div>

                        {/* Vertical Title & Artist on Spine */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden my-2">
                          <span 
                            className="text-[10px] sm:text-xs font-medium text-stone-200 tracking-wider uppercase whitespace-nowrap rotate-180 font-serif-title"
                            style={{ writingMode: 'vertical-rl' }}
                          >
                            {album.artist} — <span className="text-amber-300/90">{album.title}</span>
                          </span>
                        </div>

                        {/* Bottom Spine Year & Vinyl Type Marker */}
                        <div className="flex flex-col items-center gap-1 pt-1 border-t border-stone-700/40">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/50" 
                            style={{ backgroundColor: album.labelColor }} 
                          />
                          <span className="text-[8px] font-mono-code text-stone-400">
                            {album.releaseYear}
                          </span>
                        </div>

                        {/* Spine Crease / Texture Shadow */}
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-black/50 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />
                      </motion.div>

                      {/* Pull-out Preview Card when Hovered/Active */}
                      {isHovered && !activeSlideout && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 bg-stone-900/95 border border-amber-500/40 rounded-lg shadow-xl text-xs text-stone-200 flex items-center gap-1.5 backdrop-blur-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="font-bold">{album.title}</span>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Wooden Shelf Base Plinth */}
              <div className="w-full h-7 wood-shelf rounded-b-xl border-t border-amber-800/30 flex items-center justify-between px-4">
                <span className="text-[9px] font-mono-code text-amber-500/60 uppercase tracking-wider">
                  ROW {shelfIdx + 1} • MASTER AUDIOPHILE PRESSINGS
                </span>
                <span className="text-[9px] font-mono-code text-stone-500">
                  33⅓ / 45 RPM
                </span>
              </div>

            </div>

          </div>
        ))}
      </div>

      {/* Slide-out Album Drawer / Modal Preview when clicked */}
      <AnimatePresence>
        {activeSlideout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveSlideout(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 40 }}
              className="relative w-full max-w-2xl bg-stone-900 border border-stone-700/80 rounded-2xl p-6 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                
                {/* Album Cover & Extruded Vinyl Disc */}
                <div className="relative w-56 h-56 shrink-0 group">
                  <ArtworkImage
                    src={activeSlideout.coverUrl}
                    alt={activeSlideout.title}
                    title={activeSlideout.title}
                    artist={activeSlideout.artist}
                    catalogNumber={activeSlideout.catalogNumber}
                    waxColor={activeSlideout.waxColor}
                    className="w-full h-full object-cover rounded-xl shadow-2xl border border-stone-700"
                  />
                  {/* Extruded Vinyl Disc */}
                  <div className="absolute -right-12 top-4 w-44 h-44 rounded-full -z-10 shadow-2xl animate-spin" style={{ animationDuration: '6s' }}>
                    <div className={`w-full h-full rounded-full ${
                      activeSlideout.vinylVariant === 'amber' ? 'vinyl-color-amber' :
                      activeSlideout.vinylVariant === 'ruby' ? 'vinyl-color-ruby' :
                      activeSlideout.vinylVariant === 'sapphire' ? 'vinyl-color-sapphire' :
                      activeSlideout.vinylVariant === 'marble' ? 'vinyl-color-marble' :
                      'vinyl-grooves'
                    } flex items-center justify-center`}>
                      <div 
                        className="w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-inner"
                        style={{ backgroundColor: activeSlideout.labelColor }}
                      >
                        <span className="text-[7px] font-bold text-stone-950 font-mono-code">{activeSlideout.speed} RPM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Album Details & Actions */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono-code text-[11px]">
                      {activeSlideout.genre}
                    </span>
                    <span className="text-stone-400 text-xs font-mono-code">
                      {activeSlideout.releaseYear}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-stone-100 font-display">
                    {activeSlideout.title}
                  </h3>
                  <p className="text-stone-300 font-medium text-base mb-3">
                    {activeSlideout.artist}
                  </p>

                  <p className="text-xs text-stone-400 font-mono-code line-clamp-3 mb-6">
                    {activeSlideout.linerNotes || `${activeSlideout.tracks.length} tracks included in this vinyl edition.`}
                  </p>

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      id="shelf-modal-play-btn"
                      onClick={() => {
                        onPlayAlbum(activeSlideout);
                        setActiveSlideout(null);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-stone-950" />
                      <span>Place On Turntable</span>
                    </button>

                    <button
                      id="shelf-modal-inspect-btn"
                      onClick={() => {
                        onInspectAlbum(activeSlideout);
                        setActiveSlideout(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-medium text-sm transition-all"
                    >
                      <Info className="w-4 h-4 text-amber-400" />
                      <span>Full Tracklist</span>
                    </button>

                    <button
                      onClick={() => setActiveSlideout(null)}
                      className="px-4 py-2.5 text-stone-400 hover:text-stone-200 text-sm font-medium ml-auto"
                    >
                      Back
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
