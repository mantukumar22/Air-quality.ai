/**
 * @fileoverview Root Next.js App Router layout configuring typography fonts,
 * OpenGraph/Twitter metadata, theme surface, and the skip-to-content link.
 */

import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/** Application metadata and social preview tags for AirWise. */
export const metadata: Metadata = {
  title: 'AirWise: Urban Air Quality Assistant',
  description:
    'GenAI-powered urban air quality and winter smog assistant helping families reduce PM2.5 exposure with live AQI, tailored action plans, and impact tracking.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'AirWise: Urban Air Quality Assistant',
    description:
      'GenAI-powered urban air quality and winter smog assistant helping families reduce PM2.5 exposure with live AQI, tailored action plans, and impact tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirWise: Urban Air Quality Assistant',
    description:
      'GenAI-powered urban air quality and winter smog assistant helping families reduce PM2.5 exposure.',
  },
};

/**
 * Root layout wrapping every page with AirWise fonts and accessibility landmarks.
 *
 * @param props - Children route tree rendered inside `<body>`.
 * @returns Top-level `<html>` document shell.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="relative min-h-screen bg-[#CBE8FA] text-slate-900 dark:bg-[#071526] dark:text-slate-100 antialiased selection:bg-[#164A32] selection:text-white"
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#164A32] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
