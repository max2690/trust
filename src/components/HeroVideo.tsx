'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Обработка ошибок загрузки
    const handleError = (e: Event) => {
      console.warn('Hero видео не загружено:', video.error?.message || 'Unknown error');
      console.warn('Video error code:', video.error?.code);
      setHasError(true);
      setIsLoading(false);
    };

    // Видео готово к воспроизведению
    const handleCanPlay = () => {
      console.log('Hero видео успешно загружено');
      setIsLoading(false);
      setHasError(false);
    };

    // Видео начало загружаться
    const handleLoadStart = () => {
      console.log('Hero видео начало загрузку');
      setIsLoading(true);
    };

    // Видео загружено
    const handleLoadedData = () => {
      console.log('Hero видео данные загружены');
      setIsLoading(false);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);

    // Попытка загрузить видео
    video.load();

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <video
        ref={videoRef}
        className="object-cover absolute inset-0 w-full h-full opacity-30"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/videos/poster.jpg"
        style={{ display: hasError ? 'none' : 'block' }}
      >
        <source src="/videos/mb-trust-hero-video.mp4" type="video/mp4" />
      </video>
      {/* Overlay для затемнения */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F]/80 via-[#0B0B0F]/60 to-[#0B0B0F]/80"></div>
    </div>
  );
}
