import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "aikanpan.top" },
    ],
  },
};

export default nextConfig;
