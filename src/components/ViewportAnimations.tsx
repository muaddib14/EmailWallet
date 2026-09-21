"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ViewportAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    // Re-scan on every route change: this component lives in the root layout
    // so the effect does NOT re-run on client-side navigation by itself.
    // Without this, landing sections mounted after a router.replace (e.g.
    // logout from /inbox back to /) are never observed and stay stuck at
    // opacity-0 until a hard refresh.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    const targets = document.querySelectorAll(".animate-on-scroll:not(.animate)");
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
