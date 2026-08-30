// Utility for extracting dominant color palettes and dynamic gradients from album sleeves

export interface ExtractedPalette {
  primary: string;
  secondary: string;
  dark: string;
  glow: string;
  gradient: string;
}

// Fallback high-fidelity palette generator based on title/artist hash or presets
export function generateHarmoniousPalette(seedStr: string, hexHint?: string): ExtractedPalette {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Pre-calculated beautiful vinyl lounge tone sets
  const PRESET_PALETTES: ExtractedPalette[] = [
    {
      primary: '#d97706', // Amber warm
      secondary: '#b45309',
      dark: '#140c06',
      glow: 'rgba(217, 119, 6, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #d9770635 0%, #1a0f08 55%, #080504 100%)',
    },
    {
      primary: '#059669', // Emerald forest
      secondary: '#047857',
      dark: '#05130e',
      glow: 'rgba(5, 150, 105, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #05966935 0%, #081812 55%, #040806 100%)',
    },
    {
      primary: '#e11d48', // Rose ruby
      secondary: '#be123c',
      dark: '#16060a',
      glow: 'rgba(225, 29, 72, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #e11d4835 0%, #1a070e 55%, #080305 100%)',
    },
    {
      primary: '#2563eb', // Sapphire deep
      secondary: '#1d4ed8',
      dark: '#060d1a',
      glow: 'rgba(37, 99, 235, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #2563eb35 0%, #091222 55%, #03060c 100%)',
    },
    {
      primary: '#ca8a04', // Gold ochre
      secondary: '#a16207',
      dark: '#141006',
      glow: 'rgba(202, 138, 4, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #ca8a0435 0%, #1c1407 55%, #0a0703 100%)',
    },
    {
      primary: '#7c3aed', // Velvet violet
      secondary: '#6d28d9',
      dark: '#12081c',
      glow: 'rgba(124, 58, 237, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #7c3aed35 0%, #150a22 55%, #07030c 100%)',
    },
    {
      primary: '#0891b2', // Cyan teal
      secondary: '#0e7490',
      dark: '#061318',
      glow: 'rgba(8, 145, 178, 0.35)',
      gradient: 'radial-gradient(ellipse at 50% 30%, #0891b235 0%, #08171e 55%, #03080b 100%)',
    },
  ];

  if (hexHint && hexHint.startsWith('#')) {
    const c = hexHint;
    return {
      primary: c,
      secondary: '#1c1917',
      dark: '#0a0807',
      glow: `${c}50`,
      gradient: `radial-gradient(circle at 35% 25%, ${c}45 0%, transparent 60%), radial-gradient(circle at 75% 35%, ${c}30 0%, transparent 55%), radial-gradient(circle at 50% 85%, #18110b 0%, #080605 100%)`,
    };
  }

  const idx = Math.abs(hash) % PRESET_PALETTES.length;
  return PRESET_PALETTES[idx];
}

const paletteCache = new Map<string, ExtractedPalette>();

/**
 * Extracts dominant and accent colors from an image URL asynchronously using an offscreen canvas.
 * Falls back safely if CORS blocks pixel extraction.
 */
export async function extractAlbumPalette(imageUrl: string, fallbackTitle: string, hintColor?: string): Promise<ExtractedPalette> {
  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallback = generateHarmoniousPalette(fallbackTitle, hintColor);
          paletteCache.set(imageUrl, fallback);
          resolve(fallback);
          return;
        }

        // Downscale image to 40x40 for fast color clustering
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);

        const imgData = ctx.getImageData(0, 0, 40, 40).data;
        let rSum = 0, gSum = 0, bSum = 0;
        let maxVibrance = 0;
        let vibrantR = 217, vibrantG = 119, vibrantB = 6;
        let darkR = 15, darkG = 12, darkB = 10;

        let pixelCount = 0;
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // ignore transparent pixels

          pixelCount++;
          rSum += r;
          gSum += g;
          bSum += b;

          // Calculate color saturation / vibrance
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const brightness = (max + min) / 2;

          // We want vibrant colors (not washed out white and not pitch black)
          if (delta > maxVibrance && brightness > 30 && brightness < 220) {
            maxVibrance = delta;
            vibrantR = r;
            vibrantG = g;
            vibrantB = b;
          }
        }

        if (pixelCount > 0) {
          const avgR = Math.round(rSum / pixelCount);
          const avgG = Math.round(gSum / pixelCount);
          const avgB = Math.round(bSum / pixelCount);

          // Deep tinted background base
          darkR = Math.max(8, Math.min(24, Math.round(avgR * 0.12)));
          darkG = Math.max(6, Math.min(20, Math.round(avgG * 0.12)));
          darkB = Math.max(6, Math.min(22, Math.round(avgB * 0.12)));
        }

        const primaryHex = `rgb(${vibrantR}, ${vibrantG}, ${vibrantB})`;
        const secondaryHex = `rgb(${Math.round(vibrantR * 0.75)}, ${Math.round(vibrantG * 0.75)}, ${Math.round(vibrantB * 0.75)})`;
        const darkHex = `rgb(${darkR}, ${darkG}, ${darkB})`;
        const glow = `rgba(${vibrantR}, ${vibrantG}, ${vibrantB}, 0.38)`;

        const dynamicGradient = `
          radial-gradient(circle at 20% 25%, rgba(${vibrantR}, ${vibrantG}, ${vibrantB}, 0.42) 0%, transparent 55%),
          radial-gradient(circle at 80% 35%, rgba(${Math.round(vibrantR * 0.8)}, ${Math.round(vibrantG * 0.85)}, ${Math.round(vibrantB * 0.9)}, 0.32) 0%, transparent 60%),
          radial-gradient(circle at 50% 90%, rgba(${darkR + 15}, ${darkG + 12}, ${darkB + 10}, 0.95) 0%, ${darkHex} 100%)
        `.trim();

        const result: ExtractedPalette = {
          primary: primaryHex,
          secondary: secondaryHex,
          dark: darkHex,
          glow,
          gradient: dynamicGradient,
        };

        paletteCache.set(imageUrl, result);
        resolve(result);
      } catch (err) {
        // Fallback on CORS taint
        const fallback = generateHarmoniousPalette(fallbackTitle, hintColor);
        paletteCache.set(imageUrl, fallback);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      const fallback = generateHarmoniousPalette(fallbackTitle, hintColor);
      paletteCache.set(imageUrl, fallback);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
