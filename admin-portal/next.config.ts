import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ hostname: 'res.cloudinary.com' }] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }],
      },
    ];
  },
};

export default nextConfig;
