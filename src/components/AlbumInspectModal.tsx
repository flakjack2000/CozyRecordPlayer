import React from 'react';
import { Album } from '../types';
import { Play, Disc3, ExternalLink, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { ArtworkImage } from './ArtworkImage';

interface AlbumInspectModalProps {
  album: Album | null;
  onClose: () => void;
  onPlayAlbum: (album: Album) => void;
}

export const AlbumInspectModal: React.FC<AlbumInspectModalProps> = ({
  album,
  onClose,
  onPlayAlbum,
}) => {
  if (!album) return null;

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl bg-stone-900 border border-stone-700/90 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors z-20"
        >
          ✕
        </button>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Sleeve Artwork & Vinyl Disc */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[260px] rounded-2xl overflow-hidden shadow-2xl border border-stone-700">
              <ArtworkImage
                src={album.coverUrl}
                alt={album.title}
                title={album.title}
                artist={album.artist}
                catalogNumber={album.catalogNumber}
                waxColor={album.waxColor}
                fallbackColor={album.spineColor || '#1c1917'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />
            </div>

            {/* Vinyl Disc specs */}
            <div className="mt-4 p-3 bg-stone-950/80 rounded-xl border border-stone-800 w-full text-xs font-mono-code text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>SPEED</span>
                <span className="text-amber-400 font-bold">{album.speed} RPM</span>
              </div>
              <div className="flex justify-between">
                <span>PRESSING</span>
                <span className="capitalize text-stone-200">{album.vinylVariant.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>CATALOG</span>
                <span className="text-stone-200">{album.catalogNumber}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onPlayAlbum(album);
                onClose();
              }}
              className="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Load Onto Turntable</span>
            </button>
          </div>

          {/* Right Column: Title, Liner Notes, Tracklist */}
          <div className="md:col-span-7 flex flex-col">
            
            <div className="flex items-center gap-2 mb-1 text-xs font-mono-code">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                {album.genre}
              </span>
              <span className="text-stone-400">
                {album.releaseYear}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 font-display">
              {album.title}
            </h2>
            <p className="text-base text-stone-300 font-medium mb-4">
              {album.artist}
            </p>

            {/* Gatefold Liner Notes */}
            <div className="bg-stone-950/70 rounded-xl p-4 border border-stone-800/80 mb-5">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono-code mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="font-bold">GATEFOLD LINER NOTES</span>
              </div>
              <p className="text-xs text-stone-300 font-mono-code leading-relaxed">
                {album.linerNotes || 'Original studio analog master recording. Pressed on heavyweight virgin vinyl with poly-lined inner sleeves.'}
              </p>
            </div>

            {/* Tracklist Listing */}
            <div>
              <h4 className="text-xs font-bold text-stone-300 font-mono-code uppercase mb-2">
                Tracklist ({album.tracks.length} cuts)
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {album.tracks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-950/50 hover:bg-stone-800/60 border border-stone-800/50 text-xs font-mono-code"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-stone-500 w-4 text-center">{idx + 1}</span>
                      <span className="text-stone-200 truncate">{t.title}</span>
                    </div>
                    <span className="text-stone-500 shrink-0 ml-2">
                      {formatDuration(t.durationMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spotify Open link */}
            {album.spotifyUri && (
              <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end">
                <a
                  href={`https://open.spotify.com/album/${album.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                >
                  <span>Open Spotify Album</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

          </div>

        </div>

      </motion.div>
    </div>
  );
};
