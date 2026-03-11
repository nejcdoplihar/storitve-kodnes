/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ⬇️ DODAJ SVOJO WP DOMENO
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storitve-kodnes.si", // <-- zamenjaj
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

module.exports = nextConfig;
