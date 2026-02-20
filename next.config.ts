import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable component caching during development for simpler debugging
  // Enable in production with proper Suspense boundaries
  cacheComponents: false,
  
  // Increase body size limit for server actions (file uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
