/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/shared'],
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // NOTE: standalone output disabled - its file tracing crashes on
  // npm-workspace symlinks (ENOTDIR). Runner uses regular `next start`.
};

module.exports = nextConfig;
