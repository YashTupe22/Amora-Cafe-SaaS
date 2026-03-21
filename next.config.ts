import type { NextConfig } from "next";

const isDesktopBuild = process.env.DESKTOP_BUILD === "1";

const nextConfig: NextConfig = {
	output: isDesktopBuild ? "standalone" : undefined,
};

export default nextConfig;
