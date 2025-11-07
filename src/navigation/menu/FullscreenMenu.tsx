import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import { Box, Stack } from "@mui/joy";
import { motion, MotionConfig } from "motion/react";
import { Ref, useEffect } from "react";
import { createPortal } from "react-dom";
import { navigationBarItems } from "../items";
import NavigationBarItem from "../NavigationBarItem";
import { NavigationBarProvider } from "../NavigationBarContext";
import { css } from "@emotion/react";

export default function FullscreenMenu({
  onClose,
  rootId = "root",
}: {
  onClose: () => void;
  rootId?: string;
}) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error("Root element not found");

  return createPortal(
    <Box
      layoutRoot
      component={motion.div}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        originY: "top",
        width: "100vw",
        height: "100vh",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "end",
        padding: "1.5rem",
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-background-body), transparent 30%)",
        justifyContent: "space-between",
        backdropFilter: "blur(10px)",
        gap: 4,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Stack direction="column" gap={1} alignItems="stretch">
        <NavigationBarProvider>
          {navigationBarItems.map(({ path, icon: Icon, label }) => (
            <NavigationBarItem key={path} to={path}>
              <Icon style={{ marginRight: "0.5rem" }} />
              {label}
            </NavigationBarItem>
          ))}
        </NavigationBarProvider>
      </Stack>
      <ThemeSwitcher />
    </Box>,
    root
  );
}
