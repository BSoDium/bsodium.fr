import { IconButton } from "@mui/joy";
import { motion } from "motion/react";

export default function MobileMenuButton({
  open,
  onClick,
}: {
  open?: boolean;
  onClick?: () => void;
}) {
  return (
    <IconButton
      component={motion.button}
      color="neutral"
      onClick={onClick}
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
        background:
          "color-mix(in srgb, var(--joy-palette-background-surface), transparent 30%)",
        backdropFilter: "blur(5px)",
        border: "1px solid var(--joy-palette-neutral-outlinedBorder)",
      }}
      whileHover={{
        background:
          "color-mix(in srgb, var(--joy-palette-background-surface), transparent 50%)",
      }}
      whileTap={{
        background:
          "color-mix(in srgb, var(--joy-palette-background-surface), transparent 0%)",
      }}
      initial={false}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
    >
      <motion.svg
        stroke="currentColor"
        fill="none"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        strokeLinecap="round"
        strokeLinejoin="round"
        height="1.1em"
        width="1.1em"
        overflow="visible"
        animate={{ rotate: open ? -90 : 0 }}
      >
        <motion.line
          id="top"
          initial={{ x1: 4, y1: 6, x2: 20, y2: 6 }}
          animate={{
            x1: open ? 5 : 4,
            x2: open ? 19 : 20,
            y1: open ? 5 : 6,
            y2: open ? 19 : 6,
          }}
        />
        <motion.line
          id="central"
          initial={{ x1: 4, y1: 12, x2: 20, y2: 12, opacity: 1 }}
          animate={{
            x1: open ? 5 : 4,
            x2: open ? 19 : 20,
            y1: open ? 19 : 12,
            y2: open ? 5 : 12,
            opacity: open ? 0 : 1,
          }}
        />
        <motion.line
          id="bottom"
          initial={{ x1: 4, y1: 18, x2: 20, y2: 18 }}
          animate={{
            x1: open ? 5 : 4,
            x2: open ? 19 : 20,
            y1: open ? 19 : 18,
            y2: open ? 5 : 18,
          }}
        />
      </motion.svg>
    </IconButton>
  );
}
