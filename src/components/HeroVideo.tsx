'use client';

import { useEffect, useRef, useState } from 'react';

const VIDEO_SRC = '/videos/mb-trust-hero-video.mp4';
const POSTER_SRC = '/videos/poster.jpg';

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  // По умолчанию false: сначала показываем постер, потом на десктопе включаем видео (избегаем загрузки видео на мобильных)
  const [useVideo, setUseVideo] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobile =
        typeof window !== 'undefined' &&
        (window.innerWidth < 768 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setUseVideo(!isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!useVideo) return;

    const video = videoRef.current;
    if (!video) return;

    const handleError = () => {
      setHasError(true);
    };

    const handleCanPlay = () => {
      setHasError(false);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    video.load();

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [useVideo]);

  return (
    <div className="absolute inset-0 z-0">
      {/* На мобильных или при ошибке — только постер/фон */}
      {useVideo && !hasError ? (
        <video
          ref={videoRef}
          className="object-cover absolute inset-0 w-full h-full min-h-full min-w-full opacity-30"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER_SRC}
          style={{ objectFit: 'cover' }}
          aria-hidden
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 w-full h-full bg-[#0B0B0F] bg-cover bg-center"
          style={{
            backgroundImage: POSTER_SRC ? `url(${POSTER_SRC})` : undefined,
          }}
          aria-hidden
        />
      )}
      {/* Overlay для затемнения */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F]/80 via-[#0B0B0F]/60 to-[#0B0B0F]/80 pointer-events-none" />
    </div>
  );
}
