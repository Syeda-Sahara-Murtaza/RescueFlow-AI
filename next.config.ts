import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  // Cloudflare keeps using Vinext and the native DB binding. Only Next.js's
  // Node server build substitutes the authenticated D1 HTTP adapter.
  webpack(config, { isServer, webpack }) {
    if (isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^cloudflare:workers$/,
          resolve(process.cwd(), "lib/deployment/vercel-env.server.ts"),
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
