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

type AuraBackgroundProps = {
  /** "hero" = fixed 1040px block for the landing page. "fullscreen" = fixed, covers the whole viewport, for app screens like /inbox. */
  variant?: "hero" | "fullscreen";
  /** 0-100. How dark the overlay over the WebGL scene is. */
  overlayOpacity?: number;
};

export default function AuraBackground({ variant = "hero", overlayOpacity = 40 }: AuraBackgroundProps) {
  useEffect(() => {
    // Re-run init() on every mount (not just the first) so navigating between
    // routes re-scans for this page's own [data-us-project] node — the
    // previous page's mount already flipped isInitialized to true, so without
    // this, only the very first page visited in a session would ever render
    // the scene.
    if (window.UnicornStudio) {
      window.UnicornStudio.init();
      return;
    }

    window.UnicornStudio = { isInitialized: false, init: () => {} };
    const script = document.createElement("script");
    script.src = UNICORN_STUDIO_SRC;
    script.onload = () => {
      window.UnicornStudio?.init();
      if (window.UnicornStudio) window.UnicornStudio.isInitialized = true;
    };
    document.head.appendChild(script);
  }, []);

  const wrapperClassName =
    variant === "fullscreen" ? "aura-background-fullscreen" : "aura-background-component";

  return (
    <div className={wrapperClassName} data-alpha-mask="80">
      <div
        data-us-project={UNICORN_PROJECT_ID}
        className="absolute w-full h-full left-0 top-0 -z-10"
      />
      {/* Dims the WebGL scene so foreground content stays readable without touching the shader itself. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})` }}
      />
    </div>
  );
}
