/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@dnd-kit/core', '@dnd-kit/sortable'],
    webpackBuildWorker: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
}

export default nextConfig
