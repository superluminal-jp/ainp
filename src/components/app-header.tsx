"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useHeader } from "@/components/header-context";

export function AppHeader() {
  const { title, description, headerActions } = useHeader();

  return (
    <header className="border-b p-4 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <h1 className="font-semibold">{title}</h1>
            {description && <p className="text-sm ">{description}</p>}
          </div>
        </div>
        {headerActions && <div className="flex gap-2">{headerActions}</div>}
      </div>
    </header>
  );
}
