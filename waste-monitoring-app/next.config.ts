import type { NextConfig } from "next";

const isGitHubActions =
  process.env.GITHUB_ACTIONS === "true";

const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ??
  "waste-monitoring-dreamwear";

const basePath =
  isGitHubActions
    ? `/${repositoryName}`
    : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  basePath,

  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  images: {
    unoptimized: true,
  },
};

export default nextConfig;
