import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The app is part of the BobTester npm workspace; dependencies are hoisted
    // to its repository root instead of being installed in this folder.
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
