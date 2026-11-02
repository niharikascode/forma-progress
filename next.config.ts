import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { useTypeScriptCli: false },
  devIndicators: false,
  // The schema is read at runtime, so serverless bundles must include it.
  outputFileTracingIncludes: { "/*": ["./db/**/*"] },
};
export default config;
