import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Eco-Agent-Agora',
  images: {
    unoptimized: true,
  },
  /* 
  Note: Custom headers are not supported with 'output: export'.
  If you need COOP headers for OAuth, they must be configured on your hosting provider (e.g., Vercel, Cloudflare, Nginx).
  */
};

export default nextConfig;
