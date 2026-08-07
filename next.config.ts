import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // snowflake-sdk breaks when bundled — must stay external
  serverExternalPackages: ["snowflake-sdk"],
};

export default nextConfig;
