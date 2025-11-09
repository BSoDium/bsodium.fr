import { IconButton } from "@mui/joy";
import { motion } from "motion/react";
import { LuMenu } from "react-icons/lu";

export default function MobileMenuButton({
  open,
  onOpen,
}: {
  open?: boolean;
  onOpen?: () => void;
}) {
  return open ? (
    <span style={{ height: "2.125rem", width: "2.125rem" }} />
  ) : (
    <IconButton
      component={motion.button}
      layoutId="mobile-menu-button"
      color="neutral"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        lineHeight: 0,
        position: "relative",
        minHeight: "fit-content",
        minWidth: "fit-content",
        borderRadius: 18,
        padding: ".625rem",
        fontSize: "var(--joy-fontSize-sm)",
        fontWeight: `var(--joy-fontWeight-md)`,
        color: "var(--joy-palette-text-primary)",
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-background-surface), transparent 30%)",
        backdropFilter: "blur(5px)",
      }}
    >
      <motion.span layout>
        <LuMenu />
      </motion.span>
    </IconButton>
  );
}
