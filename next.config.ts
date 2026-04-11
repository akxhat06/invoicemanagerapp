import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/supabase/.branches/**",
          "**/supabase/.temp/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
