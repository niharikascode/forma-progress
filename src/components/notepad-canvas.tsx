"use client";

import { useState } from "react";
import { Excalidraw, MainMenu, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

export default function NotepadCanvas({
  initialScene,
  onChange,
}: {
  initialScene?: string;
  onChange: (scene: string) => void;
}) {
  const [initialData] = useState<ExcalidrawInitialDataState>(() =>
    initialScene
      ? { ...JSON.parse(initialScene), scrollToContent: true }
      : { elements: [], appState: { viewBackgroundColor: "#ffffff" } },
  );

  return (
    <Excalidraw
      initialData={initialData}
      theme="light"
      onChange={(elements, appState, files) =>
        onChange(serializeAsJSON(elements, appState, files, "local"))
      }
    >
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  );
}
