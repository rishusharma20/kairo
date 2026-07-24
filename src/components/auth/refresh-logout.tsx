"use client";

import { useEffect } from "react";

export function RefreshLogout() {
  useEffect(() => {
    // Check if the current page load was triggered by a physical refresh
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const navType = (navEntries[0] as PerformanceNavigationTiming).type;
      
      if (navType === "reload") {
        // Only force logout if the user is refreshing from within the dashboard or admin areas
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/admin')) {
          fetch('/api/auth/logout', { method: 'POST' }).then(() => {
            window.location.href = '/auth/login';
          });
        }
      }
    }
  }, []);

  return null;
}
