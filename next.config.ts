import type { NextConfig } from "next";

// Validate environment variables at startup — fails `next dev` / `next build` fast.
import "./lib/env";

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
