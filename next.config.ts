import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@editorjs/editorjs",
    "@editorjs/header",
    "@editorjs/list",
    "@editorjs/code",
    "@editorjs/inline-code",
  ],
};

export default nextConfig;
