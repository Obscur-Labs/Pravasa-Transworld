import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pravasatransworld.com';

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: 'Pravasa Transworld — Professional Visa & Immigration Services',
    template: '%s | Pravasa Transworld',
  },

  description:
    'Pravasa Transworld offers expert visa consultancy for 50+ countries. Apply online for tourist, student, work, or business visas with fast processing and real-time status tracking.',

  keywords: [
    'visa services india',
    'visa consultancy',
    'visa application online',
    'tourist visa',
    'student visa',
    'work visa',
    'business visa',
    'immigration assistance',
    'schengen visa',
    'usa visa',
    'uk visa',
    'canada visa',
    'australia visa',
    'visa processing',
    'pravasa transworld',
  ],

  authors: [{ name: 'Pravasa Transworld', url: BASE_URL }],
  creator: 'Pravasa Transworld',
  publisher: 'Pravasa Transworld',
  category: 'Immigration Services',

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

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Pravasa Transworld',
    title: 'Pravasa Transworld — Professional Visa & Immigration Services',
    description:
      'Expert visa consultancy for 50+ countries. Fast online applications, real-time tracking, and dedicated immigration support.',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Pravasa Transworld — Professional Visa & Immigration Services',
    description:
      'Expert visa consultancy for 50+ countries. Fast online applications, real-time tracking, and dedicated immigration support.',
    creator: '@pravasatransworld',
    site: '@pravasatransworld',
  },

  alternates: {
    canonical: BASE_URL,
    languages: { 'en-US': BASE_URL },
  },

  // Place favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png in /public
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  manifest: '/site.webmanifest',

  other: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
      ? { 'google-site-verification': process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
      : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
