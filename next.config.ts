import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  // Badge indikator dev Next.js tidak perlu tampil saat demo.
  devIndicators: false,
};

export default nextConfig;
