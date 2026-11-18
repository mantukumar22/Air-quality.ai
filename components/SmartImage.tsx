'use client';

import Image, { type StaticImageData } from 'next/image';
import { useState } from 'react';
import { Wind } from 'lucide-react';

interface SmartImageProps {
  src: StaticImageData | string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Resilient Next.js Image wrapper with referrerPolicy="no-referrer" and
 * a clean styled CSS/SVG fallback container if an asset fails to load.
 */
export function SmartImage({
  src,
  alt,
  className = 'h-full w-full object-cover',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: SmartImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EAEFE6] to-[#DDE6D9] p-4 text-center text-[#1E4D3B] dark:from-[#16241E] dark:to-[#1E332B] dark:text-emerald-200"
      >
        <Wind className="h-8 w-8 opacity-75" aria-hidden="true" />
        <span className="text-xs font-medium leading-snug">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      priority={priority}
      sizes={sizes}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
