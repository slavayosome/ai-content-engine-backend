/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // API-only backend, no static exports needed
  output: 'standalone',
  // Disable image optimization for backend-only
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig 