import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (Partial Prerendering) is deliberately off. Every page here
  // shows live booking data, so there is no static shell worth prerendering, and
  // with it on, a form submitted before hydration (or without JavaScript)
  // returned only streamed chunks without the page shell, rendering a blank page.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
