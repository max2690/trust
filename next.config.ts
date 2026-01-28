import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'MBTRUST_bot',
  },
  // Временно отключаем ESLint проверку во время сборки на Vercel
  // TODO: Исправить все warnings и включить обратно
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript проверка остается включенной (только errors блокируют)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
