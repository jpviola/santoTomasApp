import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
