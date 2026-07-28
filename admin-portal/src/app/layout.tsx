import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

// The admin portal is 100% client-rendered — every page is a `'use client'`
// component that fetches its own data. Prerendering it at build time only
// produces a stale HTML shell that has to be thrown away on hydration, which
// is what made deployed changes appear late. Opt the whole tree out.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portal',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
