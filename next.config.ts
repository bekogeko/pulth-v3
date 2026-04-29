import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@editorjs/editorjs",
    "@editorjs/header",
    "@editorjs/list",
  ],
};

export default nextConfig;
