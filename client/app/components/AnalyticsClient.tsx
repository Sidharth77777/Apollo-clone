"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sendPageview } from "@/lib/analytics";

export default function AnalyticsClient() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const fullPath = pathname + (search?.toString() ? `?${search}` : "");
    sendPageview(fullPath);
  }, [pathname, search]);

  return null;
}
