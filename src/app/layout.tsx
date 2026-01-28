import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import AppSessionProvider from "@/components/SessionProvider";

// Инициализация Telegram бота (только на сервере)
// Используем динамический импорт для избежания проблем при сборке
if (typeof window === 'undefined') {
  // Проверяем, что это не время сборки
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                      process.env.NEXT_PHASE === 'phase-development-build' ||
                      process.env.npm_lifecycle_event === 'build'
  
  if (!isBuildTime) {
    // Импортируем при реальном запуске сервера
    import('@/lib/telegram-init-server').catch(err => {
      console.error('Ошибка загрузки Telegram бота:', err);
    });
  }
}

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "MB-TRUST — платформа честных заданий и выплат для создателей",
  description: "Размещай задания, выбирай исполнителей, фиксируй результаты и получай оплату. KYC, антифрод, аналитика кликов. Лимиты 3/6/9 размещений по доверию.",
  keywords: "задания для блогеров, платформа амбассадоров, маркетинг в соцсетях, честные выплаты, антифрод, KYC, размещение сторис, UTM-аналитика, заработок создателям",
  authors: [{ name: "MB-TRUST" }],
  creator: "MB-TRUST",
  publisher: "MB-TRUST",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mb-trust.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "MB-TRUST — доверие, которое монетизируется",
    description: "Размещайте задания, выбирайте исполнителей и платите за результат. Прозрачно и безопасно.",
    url: 'https://mb-trust.app',
    siteName: 'MB-TRUST',
    images: [
      {
        url: '/og/cover.jpg',
        width: 1200,
        height: 630,
        alt: 'MB-TRUST — платформа честных заданий',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "MB-TRUST — доверие, которое монетизируется",
    description: "Размещайте задания, выбирайте исполнителей и платите за результат. Прозрачно и безопасно.",
    images: ['/og/cover.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MB-TRUST" />
        <meta name="application-name" content="MB-TRUST" />
        <meta name="msapplication-TileColor" content="#0B0B0F" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "MB-TRUST",
              "url": "https://mb-trust.app",
              "logo": "https://mb-trust.app/logo.svg",
              "description": "Платформа честных заданий и выплат для создателей",
              "sameAs": [
                "https://t.me/mbtrust",
                "https://vk.com/mbtrust"
              ]
            }, null, 0)
          }}
        />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "MB-TRUST",
              "operatingSystem": "Web",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "RUB"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "120"
              }
            }, null, 0)
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <AppSessionProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </AppSessionProvider>
      </body>
    </html>
  );
}
