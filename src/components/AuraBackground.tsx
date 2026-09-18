"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}

const UNICORN_STUDIO_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
const UNICORN_PROJECT_ID = "vTTCp5g4cVl9nwjlT56Z";

export default function AuraBackground() {
  useEffect(() => {
    if (window.UnicornStudio) {
      if (!window.UnicornStudio.isInitialized) {
        window.UnicornStudio.init();
        window.UnicornStudio.isInitialized = true;
      }
      return;
    }

    window.UnicornStudio = { isInitialized: false, init: () => {} };
    const script = document.createElement("script");
    script.src = UNICORN_STUDIO_SRC;
    script.onload = () => {
      if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
        window.UnicornStudio.init();
        window.UnicornStudio.isInitialized = true;
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="aura-background-component" data-alpha-mask="80">
      <div
        data-us-project={UNICORN_PROJECT_ID}
        className="absolute w-full h-full left-0 top-0 -z-10"
      />
      {/* Dims the WebGL scene so hero text stays readable without touching the shader itself. */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
    </div>
  );
}
