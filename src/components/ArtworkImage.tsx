import React, { useState, useEffect } from 'react';
import { Disc3, Music2 } from 'lucide-react';

interface ArtworkImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackColor?: string;
  title?: string;
  artist?: string;
  catalogNumber?: string;
  waxColor?: string;
  loading?: 'lazy' | 'eager';
}

// Rock-solid high-availability Unsplash CDNs as secondary and tertiary mirrors
const HIGH_AVAILABILITY_MIRRORS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
];

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackColor = '#1c1917',
  title = 'Vinyl Album',
  artist = 'Artist',
  catalogNumber = 'LP-MASTER',
  waxColor = '#d97706',
  loading = 'lazy',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [fallbackAttempt, setFallbackAttempt] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(src);
    setFallbackAttempt(0);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = () => {
    if (fallbackAttempt === 0) {
      // 1st Retry: Pick deterministic mirror from our high-availability pool based on title
      let hash = 0;
      for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
      }
      const mirrorUrl = HIGH_AVAILABILITY_MIRRORS[Math.abs(hash) % HIGH_AVAILABILITY_MIRRORS.length];
      setFallbackAttempt(1);
      setCurrentSrc(mirrorUrl);
    } else if (fallbackAttempt === 1) {
      // 2nd Retry: Alternate mirror
      let hash = 0;
      for (let i = 0; i < artist.length; i++) {
        hash = artist.charCodeAt(i) + ((hash << 5) - hash);
      }
      const secondaryMirror = HIGH_AVAILABILITY_MIRRORS[(Math.abs(hash) + 1) % HIGH_AVAILABILITY_MIRRORS.length];
      setFallbackAttempt(2);
      setCurrentSrc(secondaryMirror);
    } else {
      // 3rd Fallback: Render rich custom procedural Vinyl Sleeve art
      setHasError(true);
      setIsLoaded(true);
    }
  };

  if (hasError || !currentSrc) {
    return (
      <div 
        className={`w-full h-full relative flex flex-col justify-between p-6 select-none overflow-hidden ${className}`}
        style={{
          background: `radial-gradient(circle at 75% 25%, ${waxColor}40 0%, ${fallbackColor} 70%, #0a0807 100%)`,
        }}
      >
        {/* Subtle Grooves Texture */}
        <div className="absolute inset-0 vinyl-grooves-overlay opacity-30 pointer-events-none" />
        
        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-amber-200/80">
          <span>COSYVINYL MASTER</span>
          <span>{catalogNumber}</span>
        </div>

        {/* Center Emblem */}
        <div className="relative z-10 my-auto text-center px-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-xl">
            <Music2 className="w-7 h-7 text-amber-300" />
          </div>
          <h3 className="font-serif-title font-bold text-lg sm:text-xl text-amber-100 line-clamp-2 drop-shadow-md">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 font-medium mt-1 drop-shadow">
            {artist}
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-stone-400">
          <span>12" MICROGROOVE</span>
          <span>HIGH-FIDELITY</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-stone-950">
      {!isLoaded && (
        <div className="absolute inset-0 bg-stone-900 animate-pulse flex items-center justify-center">
          <Disc3 className="w-8 h-8 text-stone-700 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    </div>
  );
};
