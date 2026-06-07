import type { NextConfig } from 'next';

const PRIVATE_ROUTES = [
  '/login',
  '/register',
  '/dashboard/:path*',
  '/applications/:path*',
  '/apply',
  '/my-visas',
  '/notifications',
  '/document-vault',
  '/profile',
  '/payment-history',
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: 'res.cloudinary.com' }],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  async headers() {
    return PRIVATE_ROUTES.map((source) => ({
      source,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
};

export default nextConfig;
