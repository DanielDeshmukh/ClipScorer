const API_BACKEND = process.env.API_URL || "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BACKEND}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${API_BACKEND}/health`,
      },
      {
        source: "/crawl/:path*",
        destination: `${API_BACKEND}/crawl/:path*`,
      },
      {
        source: "/score/:path*",
        destination: `${API_BACKEND}/score/:path*`,
      },
      {
        source: "/embed/:path*",
        destination: `${API_BACKEND}/embed/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
