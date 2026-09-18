"use client";

import { Menu } from "lucide-react";

export default function MobileMenuButton() {
  return (
    <button
      className="md:hidden inline-flex text-sm font-medium font-geist bg-white border-neutral-200 border rounded-lg pt-2 pr-3 pb-2 pl-3 shadow-sm gap-x-2 gap-y-2 items-center text-neutral-700"
      id="mobileMenuToggle"
      onClick={() => alert("Menu coming soon")}
    >
      <Menu className="h-5 w-5" />
      Menu
    </button>
  );
}
