import { SpeedInsights } from "@vercel/speed-insights/react";
import React from "react";
import ThemeProvider from "@/components/ThemeProvider";

/**
 * A wrapper component that provides the application with the necessary providers.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <React.StrictMode>
      <SpeedInsights />
      <ThemeProvider>{children}</ThemeProvider>
    </React.StrictMode>
  );
}
