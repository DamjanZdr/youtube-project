import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable component caching during development for simpler debugging
  // Enable in production with proper Suspense boundaries
  cacheComponents: false,
};

export default nextConfig;
