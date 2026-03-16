import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  poweredByHeader: false,
  output: 'standalone',
  generateBuildId: async () => {
    return 'omni-bridge-v16';
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
