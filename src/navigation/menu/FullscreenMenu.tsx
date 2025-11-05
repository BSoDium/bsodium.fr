import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import { Box, Stack } from "@mui/joy";
import { motion } from "motion/react";
import MenuButton from "./MenuButton";
import { Ref } from "react";
import { createPortal } from "react-dom";
import { navigationBarItems } from "../items";
import NavigationBarItem from "../NavigationBarItem";

export default function FullscreenMenu({
  onClose,
  ref,
}: {
  onClose: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return createPortal(
    <Box
      ref={ref}
      layoutRoot
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        originY: "top",
        width: "100vw",
        height: "100vh",
        background:
          "color-mix(in srgb, var(--joy-palette-background-surface), transparent 10%)",
        backdropFilter: "blur(10px)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "end",
        padding: "1.5rem 1.5rem",
        gap: 4,
        justifyContent: "space-between",
      }}
    >
      <Stack direction="column" gap={2} alignItems="end">
        <MenuButton open onClick={onClose} />
        {navigationBarItems.map(({ path, icon: Icon, label }) => (
          <NavigationBarItem key={path} to={path}>
            <Icon style={{ marginRight: "0.5rem" }} />
            {label}
          </NavigationBarItem>
        ))}
      </Stack>
      <ThemeSwitcher />
    </Box>,
    document.body
  );
}
