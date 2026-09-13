import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 는 네이티브 바인딩이라 번들러가 건드리면 안 된다.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
