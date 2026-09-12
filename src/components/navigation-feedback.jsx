"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Loader2 } from "lucide-react";

function NavigationFeedback() {
  const pathname = usePathname();
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel("");
  }, [pathname]);

  useEffect(() => {
    let timeoutId;

    function handleNavigationClick(event) {
      const target = event.target.closest("nav button");
      if (!target || target.disabled) return;

      const nextLabel = target.textContent?.replace(/\s+/g, " ").trim();
      if (!nextLabel) return;

      window.clearTimeout(timeoutId);
      setLabel(nextLabel);
      timeoutId = window.setTimeout(() => setLabel(""), 5000);
    }

    document.addEventListener("click", handleNavigationClick, true);
    return () => {
      document.removeEventListener("click", handleNavigationClick, true);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!label) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed top-[4.25rem] left-1/2 z-[100] -translate-x-1/2",
        "border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
        "animate-in fade-in slide-in-from-top-1",
      )}
    >
      <Loader2 className="inline size-3 animate-spin text-primary" />{" "}
      Opening <span className="font-medium">{label}</span>...
    </div>
  );
}

export { NavigationFeedback };
