import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Preveri, da se ujema s tvojo WP domeno (npr. storitve.kodnes.com).
        hostname: "storitve-kodnes.si",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  // CORS za WP preview
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST" },
        ],
      },
    ];
  },
};

export default nextConfig;
