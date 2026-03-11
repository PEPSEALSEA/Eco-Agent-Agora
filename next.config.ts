import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Eco-Agent-Agora',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
