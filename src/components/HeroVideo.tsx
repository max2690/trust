'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Обработка ошибок загрузки
    const handleError = (e: Event) => {
      console.warn('Hero видео не загружено, используем fallback');
      setHasError(true);
      // Не скрываем полностью, просто не показываем видео
    };

    // Попытка загрузить видео
    const handleCanPlay = () => {
      setHasError(false);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {!hasError && (
        <video
          ref={videoRef}
          className="object-cover absolute inset-0 w-full h-full opacity-30"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/poster.jpg"
        >
          <source src="/videos/mb-trust-hero-video.mp4" type="video/mp4" />
        </video>
      )}
      {/* Overlay для затемнения */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F]/80 via-[#0B0B0F]/60 to-[#0B0B0F]/80"></div>
    </div>
  );
}
