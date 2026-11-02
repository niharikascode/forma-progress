import { cpSync, mkdirSync } from "node:fs";

// Serve drawing fonts locally so text works without a third-party font CDN.
mkdirSync("public/excalidraw", { recursive: true });
cpSync(
  "node_modules/@excalidraw/excalidraw/dist/prod/fonts",
  "public/excalidraw/fonts",
  { recursive: true },
);
