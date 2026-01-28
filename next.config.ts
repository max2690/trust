import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'MBTRUST_bot',
  },
  // Настройки для сборки на Vercel
  eslint: {
    // Не игнорируем ESLint, но warnings не блокируют сборку
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Не игнорируем TypeScript, но warnings не блокируют сборку
    ignoreBuildErrors: false,
  },
  // Отключаем строгую проверку во время сборки (только warnings)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
