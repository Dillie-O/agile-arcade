import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "*.ngrok-free.app", "*.ngrok.io", "*.ngrok-free.dev"],
};

export default nextConfig;
