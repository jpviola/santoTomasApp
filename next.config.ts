import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from 'next-intl/plugin';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./src/request.ts');

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
