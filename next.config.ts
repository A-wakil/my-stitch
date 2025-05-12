import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['ewfttdrfsdhgslldfgmz.supabase.co'],
  },
  eslint: {
    // Skip ESLint during builds to prevent build failures
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
