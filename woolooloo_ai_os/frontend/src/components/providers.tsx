"use client";

import { ThemeProvider } from "@/components/theme-provider";
import "bootstrap/dist/css/bootstrap.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="woolooloo-theme">
      {children}
    </ThemeProvider>
  );
}
