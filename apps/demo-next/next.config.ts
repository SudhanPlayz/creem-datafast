import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@itzsudhan/creem-datafast"],
  async rewrites() {
    return [
      {
        source: "/api/events",
        destination: "https://datafa.st/api/events",
      },
    ];
  },
};

export default nextConfig;
