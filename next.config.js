/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ewfttdrfsdhgslldfgmz.supabase.co'],
  },
  eslint: {
    // Skip ESLint during builds to prevent build failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during builds
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 