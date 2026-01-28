'use client';

import { useEffect, useRef } from 'react';

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Обработка ошибок загрузки
    const handleError = () => {
      console.error('Ошибка загрузки hero видео');
      // Скрываем видео при ошибке
      if (video.parentElement) {
        video.parentElement.style.display = 'none';
      }
    };

    // Попытка загрузить видео
    const handleCanPlay = () => {
      console.log('Hero видео успешно загружено');
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    // Попытка загрузить видео программно
    video.load();

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
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
      >
        <source src="/videos/mb-trust-hero-video.mp4" type="video/mp4" />
        Ваш браузер не поддерживает видео.
      </video>
      {/* Overlay для затемнения */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F]/80 via-[#0B0B0F]/60 to-[#0B0B0F]/80"></div>
    </div>
  );
}
